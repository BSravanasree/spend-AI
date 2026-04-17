import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export default function Landing() {
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    // useEffect(() => {
    //     if (!loading && isAuthenticated) {
    //         navigate('/dashboard', { replace: true });
    //     }
    // }, [isAuthenticated, loading, navigate]);

    // if (loading) return null;

    return (
        <div className="lp-body-wrap">
            {/* BACKGROUND ELEMENTS */}
            <div className="lp-grid-bg"></div>
            <div className="lp-glow-1"></div>
            <div className="lp-glow-2"></div>

            {/* HEADER / NAV */}
            <header className="lp-header">
                <nav className="lp-nav-container">
                    <Link to="/" className="lp-brand">
                        <div className="lp-brand-icon">
                            <span className="material-symbols-outlined" style={{ color: 'black', fontWeight: 'bold' }}>bolt</span>
                        </div>
                        <span className="lp-brand-name">SpendAI</span>
                    </Link>

                    <div className="lp-nav-links">
                        <a href="#product" className="lp-nav-link">Product</a>
                        <a href="#resources" className="lp-nav-link">Resources</a>
                        <a href="#pricing" className="lp-nav-link">Pricing</a>
                        <a href="#careers" className="lp-nav-link">Careers</a>
                    </div>

                    <div className="lp-auth-group">
                        <Link to="/login" className="lp-btn-login">Log In</Link>
                        <Link to="/signup" className="lp-btn-cta-nav">Start for Free</Link>
                    </div>
                </nav>
            </header>

            <main>
                {/* HERO SECTION */}
                <section className="lp-hero-section">
                    <div className="lp-hero-container">
                        <div className="lp-hero-announcement">
                            <span className="lp-announcement-badge">New</span>
                            <span className="lp-announcement-text">Building a Unified Model of LLM Governance <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>chevron_right</span></span>
                        </div>
                        <h1 className="lp-hero-title">
                            Take control of everything that happens after you prompt
                        </h1>
                        <p className="lp-hero-subtitle">
                            SpendAI is the infrastructure layer that investigates, fixes, and prevents cost spikes by connecting your cloud platforms and LLM observability tools.
                        </p>
                        <Link to="/signup" className="lp-hero-cta">
                            Start for Free
                        </Link>

                        {/* DASHBOARD MOCKUP */}
                        <div className="lp-mockup-wrapper">
                            <div className="lp-mockup-glow"></div>
                            <div className="lp-mockup-frame">
                                <div className="lp-mockup-header">
                                    <div className="lp-mockup-traffic-lights">
                                        <div className="lp-tl-red"></div>
                                        <div className="lp-tl-yellow"></div>
                                        <div className="lp-tl-green"></div>
                                    </div>
                                    <div className="lp-mockup-tag">AI Cost Governance Dashboard</div>
                                    <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                        <div style={{ width: '66%', height: '100%', background: '#3b82f6', borderRadius: '3px' }}></div>
                                    </div>
                                </div>
                                <div className="lp-mockup-content">
                                    <div className="lp-stats-grid">
                                        <div className="lp-stat-col">
                                            <p className="lp-stat-label">Managed Spend</p>
                                            <p className="lp-stat-value">$1,240,210</p>
                                        </div>
                                        <div className="lp-stat-col">
                                            <p className="lp-stat-label">Optimization Score</p>
                                            <p className="lp-stat-value accent">94%</p>
                                        </div>
                                        <div className="lp-stat-col">
                                            <p className="lp-stat-label">Active Providers</p>
                                            <p className="lp-stat-value">8</p>
                                        </div>
                                        <div className="lp-stat-col">
                                            <p className="lp-stat-label">Risk Level</p>
                                            <p className="lp-stat-value green">Low</p>
                                        </div>
                                    </div>

                                    <div className="lp-chart-container">
                                        <div className="lp-chart-bar" style={{ height: '40%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '65%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '45%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '85%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '70%' }}></div>
                                        <div className="lp-chart-bar highlight" style={{ height: '95%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '60%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '50%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '40%' }}></div>
                                        <div className="lp-chart-bar" style={{ height: '80%' }}></div>

                                        {/* Pulses */}
                                        <div className="lp-chart-point" style={{ top: '20%', left: '55%' }}></div>
                                        <div className="lp-chart-point" style={{ top: '45%', left: '30%', background: '#3b82f6', boxShadow: '0 0 15px #3b82f6' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section id="product" className="lp-features-section">
                    <div className="lp-feature-grid">
                        <div className="lp-feature-card">
                            <div className="lp-feature-label">
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>auto_fix_high</span> Fix
                            </div>
                            <h3 className="lp-feature-title">Optimize costs with ready-to-use guardrails.</h3>
                            <div className="lp-guardrails-box">
                                <div className="lp-guardrail-item">
                                    <span className="material-symbols-outlined lp-gi-icon">payments</span>
                                    <div className="lp-gi-content">
                                        <p className="lp-gi-title">Hard Budget Limit reached</p>
                                        <p className="lp-gi-sub">Auto-proxying to Cohere to save 40%</p>
                                    </div>
                                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b' }}>Active</span>
                                </div>
                                <div className="lp-guardrail-item" style={{ opacity: 0.5 }}>
                                    <span className="material-symbols-outlined lp-gi-icon" style={{ color: '#64748b' }}>key_off</span>
                                    <div className="lp-gi-content">
                                        <p className="lp-gi-title">Rotate Leaked Keys</p>
                                        <p className="lp-gi-sub">No compromised keys detected</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lp-feature-card">
                            <div className="lp-feature-label blue">
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>security</span> Prevent
                            </div>
                            <h3 className="lp-feature-title">Uncover blind spots before they cost you.</h3>
                            <div className="lp-guardrails-box" style={{ textAlign: 'center', padding: '40px' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '32px', margin: 'auto' }}>verified_user</span>
                                </div>
                                <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>Infrastructure Shield</p>
                                <p style={{ fontSize: '11px', color: '#64748b' }}>Scanning for rogue testing loops & shadow AI usage</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ECOSYSTEM / CONNECTORS */}
                <section className="lp-ecosystem-section">
                    <p className="lp-eco-label">Connect your stack</p>
                    <div className="lp-orbit-container">
                        <div className="lp-orbit-ring lp-ring-1"></div>
                        <div className="lp-orbit-ring lp-ring-2"></div>

                        <div className="lp-center-hub">
                            <span className="material-symbols-outlined" style={{ color: 'black', fontSize: '32px' }}>bolt</span>
                        </div>

                        {/* Outer Orbit (R2) */}
                        <div className="lp-orb-wrap" style={{ '--duration': '25s' }}>
                            <div className="lp-orb-inner" style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', '--duration': '25s' }}>
                                <div className="lp-orb">
                                    <span className="material-symbols-outlined">hub</span>
                                    <span className="lp-orb-label">OpenAI</span>
                                </div>
                            </div>
                        </div>

                        <div className="lp-orb-wrap" style={{ '--duration': '35s', transform: 'rotate(120deg)' }}>
                            <div className="lp-orb-inner" style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', '--duration': '35s' }}>
                                <div className="lp-orb">
                                    <span className="material-symbols-outlined">google</span>
                                    <span className="lp-orb-label">Gemini</span>
                                </div>
                            </div>
                        </div>

                        <div className="lp-orb-wrap" style={{ '--duration': '45s', transform: 'rotate(240deg)' }}>
                            <div className="lp-orb-inner" style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', '--duration': '45s' }}>
                                <div className="lp-orb">
                                    <span className="material-symbols-outlined">psychology</span>
                                    <span className="lp-orb-label">Anthropic</span>
                                </div>
                            </div>
                        </div>

                        {/* Inner Orbit (R1) */}
                        <div className="lp-orb-wrap" style={{ '--duration': '15s', width: '300px', height: '300px' }}>
                            <div className="lp-orb-inner" style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', '--duration': '15s' }}>
                                <div className="lp-orb" style={{ width: '44px', height: '44px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>monitoring</span>
                                    <span className="lp-orb-label">Datadog</span>
                                </div>
                            </div>
                        </div>

                        <div className="lp-orb-wrap" style={{ '--duration': '18s', width: '300px', height: '300px', transform: 'rotate(180deg)' }}>
                            <div className="lp-orb-inner" style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', '--duration': '18s' }}>
                                <div className="lp-orb" style={{ width: '44px', height: '44px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat_bubble</span>
                                    <span className="lp-orb-label">Slack</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* BENCHMARKS */}
                <section className="lp-benchmarks">
                    <div className="lp-bench-container">
                        <p className="lp-bench-quote">Teams that use SpendAI diagnose more issues and spend less time solving them.</p>
                        <div className="lp-bench-grid">
                            <div className="lp-bench-item">
                                <h4>10x</h4>
                                <div className="lp-bench-line"><div className="lp-line-dot"></div></div>
                                <p className="lp-bench-label">Faster Budget Alerts (MTTR)</p>
                            </div>
                            <div className="lp-bench-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4>$1.2M+</h4>
                                    <div style={{ width: '80px', height: '80px', opacity: 0.3 }}>
                                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                                            <circle cx="50" cy="50" r="45" stroke="#3b82f6" strokeWidth="8" fill="none" strokeDasharray="282.7" strokeDashoffset="70" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="lp-bench-label">AI spend managed across enterprise</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA */}
                <section className="lp-final-cta">
                    <h2 className="lp-final-title">Be ready for whatever you launch next</h2>
                    <Link to="/signup" className="lp-hero-cta">
                        Start for Free
                    </Link>
                    <p className="lp-no-cc">No credit card required. 1-minute setup.</p>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="lp-footer">
                <div className="lp-footer-container">
                    <div className="lp-footer-grid">
                        <div className="lp-footer-about">
                            <Link to="/" className="lp-brand">
                                <div className="lp-brand-icon" style={{ width: '24px', height: '24px' }}>
                                    <span className="material-symbols-outlined" style={{ color: 'black', fontSize: '14px', fontWeight: 'bold' }}>bolt</span>
                                </div>
                                <span className="lp-brand-name" style={{ fontSize: '1rem' }}>SpendAI</span>
                            </Link>
                            <p>Infrastructure-grade governance for the generative era. Optimizing compute and protecting keys for modern teams.</p>
                        </div>
                        <div className="lp-footer-col">
                            <h5>Product</h5>
                            <ul>
                                <li><a href="#">Gateway</a></li>
                                <li><a href="#">Analytics</a></li>
                                <li><a href="#">Security</a></li>
                            </ul>
                        </div>
                        <div className="lp-footer-col">
                            <h5>Company</h5>
                            <ul>
                                <li><a href="#">About</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Blog</a></li>
                            </ul>
                        </div>
                        <div className="lp-footer-col">
                            <h5>Connect</h5>
                            <ul>
                                <li><a href="#">Twitter (X)</a></li>
                                <li><a href="#">LinkedIn</a></li>
                                <li><a href="#">GitHub</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="lp-footer-bottom">
                        <div style={{ display: 'flex', gap: '32px', marginBottom: '48px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>© 2024 SPENDAI</span>
                            <a href="#" style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textDecoration: 'none' }}>PRIVACY</a>
                            <a href="#" style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textDecoration: 'none' }}>TERMS</a>
                            <a href="#" style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textDecoration: 'none' }}>SECURITY</a>
                        </div>
                        <div className="lp-footer-huge-text">SpendAI</div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
