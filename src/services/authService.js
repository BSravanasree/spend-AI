const { supabaseAdmin, supabaseClient } = require('../config/supabase');
const logger = require('../config/logger');

/**
 * AuthService handles all authentication operations
 * Including organization auto-creation on signup
 */
class AuthService {

    /**
     * Sign up a new user and auto-create organization
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} organizationName - Name of organization to create
     * @returns {Object} User data, organization data, and session
     */
    async signup(email, password, organizationName) {
        try {
            // Step 1: Create user in Supabase Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true // Auto-confirm email for MVP
            });

            if (authError) {
                const msg = authError.message || 'Auth failed';
                if (authError.message && (authError.message.includes('already been registered') || authError.message.includes('already exists'))) {
                    throw new Error('This email is already registered. Please sign in instead.');
                }
                throw new Error(`Auth error: ${msg}`);
            }

            const userId = authData.user.id;

            // Step 2: Create organization
            const { data: orgData, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: organizationName,
                    subscription_status: 'pending',
                    plan_tier: 'free',
                    trial_ends_at: null
                })
                .select()
                .single();

            if (orgError) {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                const msg = orgError.message || 'Organization creation failed';
                if (msg.includes('column') && msg.includes('does not exist')) {
                    throw new Error('Database schema is out of date. Please run the latest migrations in Supabase (e.g. 008_manual_billing_schema.sql).');
                }
                throw new Error(`Organization creation error: ${msg}`);
            }

            // Step 3: Create user profile with admin role
            const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .insert({
                    id: userId,
                    organization_id: orgData.id,
                    email: email,
                    role: 'owner' // First user in a new org is always owner
                })
                .select()
                .single();

            if (userError) {
                await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
                await supabaseAdmin.auth.admin.deleteUser(userId);
                const msg = userError.message || 'User profile creation failed';
                if (msg.includes('column') && msg.includes('does not exist')) {
                    throw new Error('Database schema is out of date. Please run the latest migrations in Supabase.');
                }
                if (msg.includes('violates check constraint') && msg.includes('role')) {
                    throw new Error('User profile creation error: invalid role. Ensure migrations 001 and 008 have been run.');
                }
                throw new Error(`User profile creation error: ${msg}`);
            }

            // Step 4: Generate session token for the user
            const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email
            });

            if (sessionError) {
                logger.warn(`Session generation warning: ${sessionError.message}`, 'AUTH');
            }

            return {
                success: true,
                user: {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    organizationId: userData.organization_id,
                    organization_id: userData.organization_id
                },
                organization: {
                    id: orgData.id,
                    name: orgData.name
                },
                message: 'User created successfully. Please use the login endpoint to get a session.'
            };

        } catch (error) {
            logger.error(`Signup error: ${error.message}`, 'AUTH');
            throw error;
        }
    }

    /**
     * Log in an existing user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} User data with session token
     */
    async login(email, password) {
        try {
            // Step 1: Sign in with Supabase Auth (MUST use anon key client)
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw new Error(`Login error: ${authError.message}`);
            }

            const userId = authData.user.id;

            // Step 2: Get user profile with organization details
            const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .select(`
          id,
          email,
          role,
          organization_id,
          organizations:organization_id (
            id,
            name,
            subscription_status
          )
        `)
                .eq('id', userId)
                .single();

            if (userError) {
                throw new Error(`User profile error: ${userError.message}`);
            }

            // Extract organization (handle array or object)
            const org = Array.isArray(userData.organizations)
                ? userData.organizations[0]
                : userData.organizations;

            return {
                success: true,
                user: {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    organizationId: userData.organization_id,
                    organization_id: userData.organization_id
                },
                organization: org,
                session: {
                    accessToken: authData.session.access_token,
                    refreshToken: authData.session.refresh_token,
                    expiresAt: authData.session.expires_at
                }
            };

        } catch (error) {
            logger.error(`Login error: ${error.message}`, 'AUTH');
            throw error;
        }
    }

    /**
     * Verify a JWT token and return user data
     * @param {string} token - JWT access token
     * @returns {Object} User data
     */
    async verifyToken(token) {
        try {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

            if (error) {
                throw new Error(`Token verification error: ${error.message}`);
            }

            // Get user profile
            let { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .select(`
                    id,
                    email,
                    role,
                    organization_id,
                    organizations:organization_id (
                        id,
                        name,
                        subscription_status
                    )
                `)
                .eq('id', user.id)
                .maybeSingle();

            // JIT Provisioning: If user exists in Auth but not in our 'users' table (common with social login)
            if (!userData && !userError) {
                logger.info(`JIT Provisioning new social user: ${user.email}`, 'AUTH');

                // 1. Create a default personal organization
                const { data: orgData, error: orgErr } = await supabaseAdmin
                    .from('organizations')
                    .insert({
                        name: `${user.email.split('@')[0]}'s Org`,
                        subscription_status: 'pending',
                        plan_tier: 'free',
                        trial_ends_at: null
                    })
                    .select()
                    .single();

                if (orgErr) throw orgErr;

                // 2. Create the user profile
                const { data: newProfile, error: profileErr } = await supabaseAdmin
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        organization_id: orgData.id,
                        role: 'owner' // First user via social login is always owner
                    })
                    .select(`
                        id,
                        email,
                        role,
                        organization_id,
                        organizations:organization_id (
                            id,
                            name,
                            subscription_status
                        )
                    `)
                    .single();

                if (profileErr) throw profileErr;
                userData = newProfile;
            } else if (userError) {
                throw new Error(`User profile error: ${userError.message}`);
            }

            return {
                success: true,
                user: {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    organizationId: userData.organization_id,
                    organization_id: userData.organization_id,
                    organization: userData.organizations
                }
            };

        } catch (error) {
            logger.error(`Token verification error: ${error.message}`, 'AUTH');
            throw error;
        }
    }
}

module.exports = new AuthService();
