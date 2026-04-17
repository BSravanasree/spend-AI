/**
 * Subscription Status Banner
 * Shows current subscription status, trial countdown, and upgrade prompts
 */

import React, { useState, useEffect } from 'react';
import './SubscriptionBanner.css';

export default function SubscriptionBanner({ organization }) {
    const [daysRemaining, setDaysRemaining] = useState(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!organization) return;

        const now = new Date();
        const trialEndsAt = organization.trial_ends_at ? new Date(organization.trial_ends_at) : null;
        const subscriptionEndsAt = organization.subscription_ends_at ? new Date(organization.subscription_ends_at) : null;

        // Calculate days remaining
        if (organization.subscription_status === 'trial' && trialEndsAt) {
            const days = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
            setDaysRemaining(days);
            setStatus('trial');
        } else if (organization.subscription_status === 'active' && subscriptionEndsAt) {
            const days = Math.ceil((subscriptionEndsAt - now) / (1000 * 60 * 60 * 24));
            setDaysRemaining(days);
            setStatus('active');
        } else if (organization.subscription_status === 'expired') {
            setStatus('expired');
        } else if (organization.subscription_status === 'pending') {
            setStatus('pending');
        }
    }, [organization]);

    if (!organization || status === 'loading') {
        return null;
    }

    // Don't show banner for active subscriptions with > 7 days remaining
    if (status === 'active' && daysRemaining > 7) {
        return null;
    }

    const getBannerConfig = () => {
        switch (status) {
            case 'pending':
                return {
                    type: 'info',
                    icon: '⏳',
                    title: 'Account Pending Approval',
                    message: 'Your account is under review. You\'ll receive an email once approved.',
                    action: null
                };

            case 'trial':
                if (daysRemaining <= 0) {
                    return {
                        type: 'warning',
                        icon: '⚠️',
                        title: 'Trial Expired',
                        message: 'Your trial has ended. Contact us to activate your subscription.',
                        action: {
                            text: 'Contact Sales',
                            link: 'mailto:sales@spendai.com'
                        }
                    };
                } else if (daysRemaining <= 3) {
                    return {
                        type: 'warning',
                        icon: '⏰',
                        title: `Trial Ending in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`,
                        message: 'Your trial is ending soon. Upgrade now to continue using all features.',
                        action: {
                            text: 'Upgrade Now',
                            link: '/billing'
                        }
                    };
                } else {
                    return {
                        type: 'info',
                        icon: '🎉',
                        title: `${daysRemaining} Days Left in Trial`,
                        message: `You're on the ${organization.plan_tier} plan. Enjoying Spend AI?`,
                        action: {
                            text: 'View Plans',
                            link: '/billing'
                        }
                    };
                }

            case 'active':
                if (daysRemaining <= 3) {
                    return {
                        type: 'warning',
                        icon: '💳',
                        title: `Subscription Renewing in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`,
                        message: 'Your subscription will renew soon. Make sure your payment is ready.',
                        action: {
                            text: 'View Billing',
                            link: '/billing'
                        }
                    };
                }
                return null;

            case 'expired':
                return {
                    type: 'error',
                    icon: '❌',
                    title: 'Subscription Expired',
                    message: 'Your subscription has expired. Contact us to reactivate your account.',
                    action: {
                        text: 'Contact Sales',
                        link: 'mailto:sales@spendai.com'
                    }
                };

            default:
                return null;
        }
    };

    const config = getBannerConfig();

    if (!config) return null;

    return (
        <div className={`subscription-banner ${config.type}`}>
            <div className="banner-content">
                <span className="banner-icon">{config.icon}</span>
                <div className="banner-text">
                    <h4>{config.title}</h4>
                    <p>{config.message}</p>
                </div>
            </div>
            {config.action && (
                <a
                    href={config.action.link}
                    className="banner-action"
                >
                    {config.action.text}
                </a>
            )}
            <button
                className="banner-close"
                onClick={() => setStatus('dismissed')}
                aria-label="Dismiss banner"
            >
                ×
            </button>
        </div>
    );
}
