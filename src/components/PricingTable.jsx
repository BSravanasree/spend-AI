/**
 * Pricing Table Component
 * Displays all available plans with features and pricing
 */

import React from 'react';
import './PricingTable.css';

const plans = [
    {
        tier: 'free',
        name: 'Free Trial',
        price: 0,
        period: '14 days',
        description: 'Perfect for testing the platform',
        features: [
            'Up to 3 projects',
            'Up to 5 team members',
            '$100/month AI spend tracking',
            '30 days data retention',
            'Basic dashboard',
            'Email support'
        ],
        cta: 'Start Free Trial',
        highlighted: false
    },
    {
        tier: 'starter',
        name: 'Starter',
        price: 49,
        period: 'per month',
        description: 'For small teams getting started',
        features: [
            'Up to 10 projects',
            'Up to 20 team members',
            '$1,000/month AI spend tracking',
            '90 days data retention',
            'Advanced analytics',
            'Budget alerts & notifications',
            'API access',
            'Priority email support',
            'Export reports (CSV/PDF)'
        ],
        cta: 'Get Started',
        highlighted: true
    },
    {
        tier: 'pro',
        name: 'Professional',
        price: 199,
        period: 'per month',
        description: 'For growing companies',
        features: [
            'Up to 50 projects',
            'Up to 100 team members',
            'Unlimited AI spend tracking',
            '1 year data retention',
            'Advanced analytics & forecasting',
            'Real-time budget alerts',
            'Full API access',
            'Custom integrations',
            'Webhook support',
            'SSO (coming soon)',
            'Dedicated account manager',
            'Priority support (24/7)'
        ],
        cta: 'Contact Sales',
        highlighted: false
    },
    {
        tier: 'enterprise',
        name: 'Enterprise',
        price: null,
        period: 'custom',
        description: 'For large organizations',
        features: [
            'Unlimited projects',
            'Unlimited team members',
            'Unlimited AI spend tracking',
            'Unlimited data retention',
            'Custom analytics & reporting',
            'Advanced budget controls',
            'Full API access',
            'Custom integrations',
            'Webhook support',
            'SSO & SAML',
            'On-premise deployment option',
            'Dedicated infrastructure',
            'SLA guarantee',
            'White-label option',
            'Dedicated support team'
        ],
        cta: 'Contact Sales',
        highlighted: false
    }
];

export default function PricingTable({ onSelectPlan }) {
    return (
        <div className="pricing-container">
            <div className="pricing-header">
                <h2>Simple, Transparent Pricing</h2>
                <p>Choose the plan that fits your needs. All plans include 14-day free trial.</p>
            </div>

            <div className="pricing-grid">
                {plans.map((plan) => (
                    <div
                        key={plan.tier}
                        className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
                    >
                        {plan.highlighted && <div className="popular-badge">Most Popular</div>}

                        <div className="plan-header">
                            <h3>{plan.name}</h3>
                            <p className="plan-description">{plan.description}</p>
                        </div>

                        <div className="plan-price">
                            {plan.price === null ? (
                                <div className="price-custom">
                                    <span className="price-amount">Custom</span>
                                </div>
                            ) : (
                                <>
                                    <span className="price-currency">$</span>
                                    <span className="price-amount">{plan.price}</span>
                                    <span className="price-period">/{plan.period}</span>
                                </>
                            )}
                        </div>

                        <ul className="plan-features">
                            {plan.features.map((feature, index) => (
                                <li key={index}>
                                    <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            className={`plan-cta ${plan.highlighted ? 'primary' : 'secondary'}`}
                            onClick={() => onSelectPlan && onSelectPlan(plan.tier)}
                        >
                            {plan.cta}
                        </button>
                    </div>
                ))}
            </div>

            <div className="pricing-footer">
                <p>All plans include our core features. Need something custom? <a href="mailto:sales@spendai.com">Contact us</a></p>
            </div>
        </div>
    );
}
