import React from 'react';

export default function Terms() {
    return (
        <div style={{
            maxWidth: '720px', margin: '80px auto',
            padding: '0 24px', fontFamily: 'sans-serif',
            color: '#f0f0ee', lineHeight: '1.7'
        }}>
            <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>
                Terms of Service
            </h1>
            <p style={{ color: '#888', marginBottom: '40px' }}>
                Last updated: January 2025
            </p>

            <h2>Service</h2>
            <p>SpendAI provides an AI API governance and
                cost-control proxy service. By signing up you
                agree to these terms.</p>

            <h2>Acceptable use</h2>
            <p>You may not use SpendAI to circumvent AI
                provider rate limits, share proxy keys publicly,
                or resell access to the proxy service.</p>

            <h2>Billing</h2>
            <p>Subscriptions are billed monthly. Downgrades
                take effect at the end of the billing period.
                No refunds are provided for partial months.</p>

            <h2>Limitation of liability</h2>
            <p>SpendAI is not liable for AI provider
                outages, cost overruns beyond enforced limits,
                or data loss. Use at your own risk.</p>

            <h2>Termination</h2>
            <p>We reserve the right to terminate accounts
                that violate these terms. You may cancel
                anytime from the billing page.</p>

            <h2>Contact</h2>
            <p>legal@spendai.com</p>
        </div>
    );
}
