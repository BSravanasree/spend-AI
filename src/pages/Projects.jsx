import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import './Projects.css';

/* ── helpers ─────────────────────────────────────────── */
function budgetColor(pct) {
    if (pct >= 100) return '#f44336';
    if (pct >= 80)  return '#f44336';
    if (pct >= 60)  return '#ff9800';
    return '#4caf50';
}

function fmtUsd(val) {
    if (val == null || val === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(val);
}

/* ── Project Card ─────────────────────────────────────── */
function ProjectCard({ project, canDelete, onDelete, onClick }) {
    const budget  = parseFloat(project.monthly_budget_usd) || 0;
    const spent   = parseFloat(project.mtd_spend)          || 0;
    const pct     = budget > 0 ? (spent / budget) * 100 : 0;
    const barColor = budgetColor(pct);
    const isBlocked = budget > 0 && spent >= budget;
    const keyCount  = project.key_count ?? project.proxy_key_count ?? 0;

    return (
        <div style={{
            background: '#111111',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '24px',
            cursor: 'pointer',
            transition: 'border-color 0.2s, transform 0.2s',
            position: 'relative',
        }} 
        className="project-card-hover"
        onClick={onClick}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                        margin: '0 0 4px',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#f0f0ee',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {project.name}
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#666',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {project.description || 'No description'}
                    </p>
                </div>
                {canDelete && (
                    <button onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }} style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#444',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.2s'
                    }} className="delete-btn-hover">🗑️</button>
                )}
            </div>
            
            {/* Budget progress bar */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '6px'
                }}>
                    <span>Budget used</span>
                    <span>
                        {fmtUsd(spent)} 
                        / {budget > 0 ? fmtUsd(budget) : '∞'}
                    </span>
                </div>
                <div style={{
                    background: '#1a1a1a',
                    borderRadius: '4px',
                    height: '6px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        borderRadius: '4px',
                        width: `${Math.min(pct, 100)}%`,
                        background: barColor,
                        transition: 'width 0.3s'
                    }} />
                </div>
                {isBlocked && (
                    <span style={{
                        fontSize: '11px',
                        color: '#f44336',
                        fontWeight: '600',
                        marginTop: '4px',
                        display: 'block'
                    }}>
                        🚨 BLOCKED — budget exceeded
                    </span>
                )}
            </div>
            
            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontSize: '12px',
                    color: '#555'
                }}>
                    {keyCount} proxy keys
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        style={{
                            background: '#1a1a2e',
                            border: '1px solid #5b6af7',
                            color: '#5b6af7',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                        className="btn-card-action">
                        Open →
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Skeleton card ────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '24px',
            height: '180px'
        }}>
            <div className="skel skel-title" style={{ height: '20px', width: '60%', background: '#1a1a1a', borderRadius: '4px', marginBottom: '8px' }} />
            <div className="skel skel-desc" style={{ height: '14px', width: '80%', background: '#1a1a1a', borderRadius: '4px', marginBottom: '24px' }} />
            <div className="skel skel-bar" style={{ height: '6px', width: '100%', background: '#1a1a1a', borderRadius: '4px', marginBottom: '8px' }} />
            <div className="skel skel-footer" style={{ height: '24px', width: '40%', background: '#1a1a1a', borderRadius: '4px', marginTop: '20px' }} />
        </div>
    );
}

/* ── Main Page ────────────────────────────────────────── */
function Projects() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const nameRef = useRef(null);

    const [projects,         setProjects]         = useState([]);
    const [loading,          setLoading]           = useState(true);
    const [error,            setError]             = useState('');

    const [showCreateModal,  setShowCreateModal]   = useState(false);
    const [showDeleteModal,  setShowDeleteModal]   = useState(false);
    const [selectedProject,  setSelectedProject]   = useState(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAdmin  = ['admin', 'owner', 'super_admin'].includes(user?.role);
    const canDelete = ['owner', 'super_admin'].includes(user?.role);

    useEffect(() => {
        if (user) loadProjects();
    }, [user]);

    useEffect(() => {
        if (showCreateModal) {
            setTimeout(() => nameRef.current?.focus(), 100);
        } else {
            setError('');
            setName('');
            setDescription('');
            setBudget('');
        }
    }, [showCreateModal]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const result = await projectService.getProjects();
            setProjects(result.projects || []);
        } catch (err) {
            console.error('[Projects] Load error:', err);
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e?.preventDefault();
        if (!name.trim()) return;

        setSubmitting(true);
        setError('');
        try {
            await projectService.createProject(name.trim(), description.trim(), parseFloat(budget) || 0);
            toast.success('Project created successfully!');
            setShowCreateModal(false);
            loadProjects();
        } catch (err) {
            const message = 
                err?.response?.data?.error ||
                err?.data?.error ||
                err?.message ||
                'Failed to create project. Please try again.';
            
            setError(message);
            console.error('Project creation failed:', err);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedProject) return;
        setSubmitting(true);
        try {
            await projectService.deleteProject(selectedProject.id);
            toast.success('Project deleted');
            setShowDeleteModal(false);
            setSelectedProject(null);
            setDeleteConfirm('');
            loadProjects();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to delete project');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="app-shell">
                <Sidebar />
                <div className="main-content">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '400px',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #1a1a1a',
                            borderTop: '3px solid #5b6af7',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Loading projects...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main-content">
                <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '700', color: '#f0f0ee', margin: '0 0 8px' }}>
                            Projects
                        </h1>
                        <p className="page-sub" style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                            Manage your AI cost containers and proxy keys
                        </p>
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                background: '#5b6af7',
                                border: 'none',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            className="bg-hover-effect">
                            + New Project
                        </button>
                    )}
                </div>

                {projects.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 24px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '16px',
                            opacity: 0.5
                        }}>📁</div>
                        <h3 style={{
                            margin: '0 0 8px',
                            color: '#f0f0ee',
                            fontSize: '18px'
                        }}>
                            No projects yet
                        </h3>
                        <p style={{
                            color: '#666',
                            margin: '0 0 24px',
                            fontSize: '14px',
                            maxWidth: '300px',
                            marginLeft: 'auto',
                            marginRight: 'auto'
                        }}>
                            Create a project to start tracking AI costs
                            and generating proxy keys.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                background: '#5b6af7',
                                border: 'none',
                                color: 'white',
                                padding: '12px 28px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}>
                            + Create First Project
                        </button>
                    </div>
                ) : (
                    <div className="projects-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                    }}>
                        {projects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                canDelete={canDelete}
                                onDelete={() => { setSelectedProject(project); setShowDeleteModal(true); }}
                                onClick={() => navigate(`/projects/${project.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create Modal ───────────────────────────────────── */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#111',
                        border: '1px solid #222',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '480px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                    }}>
                        <h2 style={{
                            margin: '0 0 8px',
                            fontSize: '20px',
                            color: '#f0f0ee'
                        }}>
                            Create New Project
                        </h2>
                        <p style={{
                            margin: '0 0 24px',
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            Each project gets its own proxy keys 
                            and budget limit.
                        </p>
                        
                        {error && (
                            <div style={{
                                background: 'rgba(244,67,54,0.1)',
                                border: '1px solid #f44336',
                                borderRadius: '8px',
                                padding: '12px',
                                color: '#ff6b6b',
                                fontSize: '13px',
                                marginBottom: '16px'
                            }}>❌ {error}</div>
                        )}
                        
                        <label style={{
                            display: 'block',
                            marginBottom: '16px'
                        }}>
                            <span style={{
                                fontSize: '13px',
                                color: '#888',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Project Name *
                            </span>
                            <input
                                ref={nameRef}
                                type="text"
                                placeholder="e.g. Production App, Dev Team"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: '#0a0a0a',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    color: '#f0f0ee',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </label>
                        
                        <label style={{
                            display: 'block',
                            marginBottom: '16px'
                        }}>
                            <span style={{
                                fontSize: '13px',
                                color: '#888',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Description (optional)
                            </span>
                            <textarea
                                placeholder="What is this project for?"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                style={{
                                    width: '100%',
                                    background: '#0a0a0a',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    color: '#f0f0ee',
                                    fontSize: '14px',
                                    outline: 'none',
                                    resize: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </label>
                        
                        <label style={{
                            display: 'block',
                            marginBottom: '24px'
                        }}>
                            <span style={{
                                fontSize: '13px',
                                color: '#888',
                                display: 'block',
                                marginBottom: '6px'
                            }}>
                                Monthly Budget (USD)
                            </span>
                            <div style={{
                                position: 'relative'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#666',
                                    fontSize: '14px'
                                }}>$</span>
                                <input
                                    type="number"
                                    placeholder="100"
                                    min="0"
                                    value={budget}
                                    onChange={e => setBudget(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: '#0a0a0a',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        padding: '10px 14px 10px 28px',
                                        color: '#f0f0ee',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <p style={{
                                margin: '6px 0 0',
                                fontSize: '12px',
                                color: '#555'
                            }}>
                                Requests auto-block when this limit is hit.
                                Set 0 for no limit.
                            </p>
                        </label>
                        
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #333',
                                    color: '#888',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={submitting || !name.trim()}
                                style={{
                                    background: submitting ? '#333' : '#5b6af7',
                                    border: 'none',
                                    color: 'white',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    opacity: !name.trim() ? 0.5 : 1
                                }}>
                                {submitting ? 'Creating...' : 'Create Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ───────────────────────────────────── */}
            {showDeleteModal && selectedProject && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(6px)'
                }}>
                    <div style={{
                        background: '#111',
                        border: '1px solid #222',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '440px'
                    }}>
                        <h3 style={{ margin: '0 0 12px', color: '#f0f0ee', fontSize: '20px' }}>Delete Project?</h3>
                        <p style={{ color: '#888', fontSize: '14px', margin: '0 0 20px', lineHeight: '1.5' }}>
                            This will permanently delete <strong style={{ color: '#f0f0ee' }}>{selectedProject.name}</strong> and
                            revoke all associated proxy keys. This action cannot be undone.
                        </p>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px' }}>
                                Type the project name to confirm
                            </label>
                            <input
                                type="text"
                                placeholder={selectedProject.name}
                                value={deleteConfirm}
                                onChange={e => setDeleteConfirm(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: '#0a0a0a',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    color: '#f0f0ee',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowDeleteModal(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                Cancel
                            </button>
                            <button
                                disabled={submitting || deleteConfirm !== selectedProject.name}
                                onClick={handleDelete}
                                style={{
                                    background: deleteConfirm !== selectedProject.name ? '#222' : '#f44336',
                                    border: 'none',
                                    color: 'white',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: deleteConfirm !== selectedProject.name ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                            >
                                {submitting ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Projects;
