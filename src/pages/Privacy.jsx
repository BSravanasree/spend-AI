import React from 'react';

export default function Privacy() {
    return (
        <div style={{
            maxWidth: '720px', margin: '80px auto',
            padding: '0 24px', fontFamily: 'sans-serif',
            color: '#f0f0ee', lineHeight: '1.7'
        }}>
            <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>
                Privacy Policy
            </h1>
            <p style={{ color: '#888', marginBottom: '40px' }}>
                Last updated: January 2025
            </p>

            <h2>What we collect</h2>
            <p>SpendAI collects account information
                (email, organization name), AI API usage
                metadata (model used, token counts, cost),
                and billing information. We do NOT collect
                or store the content of your AI requests.</p>

            <h2>How we use your data</h2>
            <p>Your data is used solely to provide the
                SpendAI service — displaying usage analytics,
                enforcing budgets, and sending alert emails.</p>

            <h2>Security</h2>
            <p>All API keys are encrypted at rest using
                AES-256-GCM encryption. Usage data is stored
                in Supabase, which is SOC2 Type II certified.</p>

            <h2>Data retention</h2>
            <p>Usage logs are retained according to your
                plan tier. Account data is deleted within 30
                days of account closure upon request.</p>

            <h2>Contact</h2>
            <p>privacy@spendai.com</p>
        </div>
    );
}
