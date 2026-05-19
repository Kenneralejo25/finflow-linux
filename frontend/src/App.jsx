import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  PiggyBank, 
  Download, 
  Sun, 
  Moon, 
  Search, 
  DollarSign, 
  Calendar, 
  Tag, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  // Application State
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // New Transaction Form State
  const [txForm, setTxForm] = useState({
    type: 'expense',
    category: 'Alimentación',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // New Goal Form State
  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    target_date: ''
  });

  // Helper: Toast Notifications
  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Lifecycle & Theme Setting
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch initial database items
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [txRes, goalRes] = await Promise.all([
          fetch(`${API_BASE}/transactions`),
          fetch(`${API_BASE}/goals`)
        ]);

        if (txRes.ok && goalRes.ok) {
          const txData = await txRes.json();
          const goalData = await goalRes.json();
          setTransactions(txData);
          setGoals(goalData);
        } else {
          triggerToast('Error al conectar con la base de datos de AWS.', 'danger');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        triggerToast('No se pudo conectar con el servidor backend.', 'danger');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Theme Toggle
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Add Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      triggerToast('Ingrese un monto válido mayor a 0', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...txForm,
          amount: parseFloat(txForm.amount)
        })
      });

      if (response.ok) {
        const newTx = await response.json();
        setTransactions(prev => [newTx, ...prev]);
        setTxForm({
          type: 'expense',
          category: 'Alimentación',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        });
        triggerToast('Transacción registrada exitosamente.');
      } else {
        triggerToast('Error al registrar la transacción', 'danger');
      }
    } catch (err) {
      triggerToast('Error de red al intentar registrar.', 'danger');
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/transactions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        triggerToast('Transacción eliminada.');
      } else {
        triggerToast('No se pudo eliminar la transacción.', 'danger');
      }
    } catch (err) {
      triggerToast('Error de conexión al eliminar.', 'danger');
    }
  };

  // Add Goal
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.name || !goalForm.target_amount || !goalForm.target_date) {
      triggerToast('Complete todos los campos obligatorios de la meta', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: goalForm.name,
          target_amount: parseFloat(goalForm.target_amount),
          current_amount: parseFloat(goalForm.current_amount || 0),
          target_date: goalForm.target_date
        })
      });

      if (response.ok) {
        const newGoal = await response.json();
        setGoals(prev => [...prev, newGoal]);
        setGoalForm({ name: '', target_amount: '', current_amount: '', target_date: '' });
        triggerToast('Meta de ahorro creada con éxito.');
      } else {
        triggerToast('Error al crear la meta.', 'danger');
      }
    } catch (err) {
      triggerToast('Error de red al guardar la meta.', 'danger');
    }
  };

  // Update Goal Progress
  const handleUpdateGoalProgress = async (id, newAmount) => {
    if (newAmount === '' || isNaN(newAmount) || parseFloat(newAmount) < 0) {
      triggerToast('Ingrese un valor numérico válido', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_amount: parseFloat(newAmount) })
      });

      if (response.ok) {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount: parseFloat(newAmount) } : g));
        triggerToast('Progreso de la meta actualizado.');
      } else {
        triggerToast('Error al actualizar progreso.', 'danger');
      }
    } catch (err) {
      triggerToast('Error de conexión al actualizar la meta.', 'danger');
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/goals/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setGoals(prev => prev.filter(g => g.id !== id));
        triggerToast('Meta eliminada.');
      } else {
        triggerToast('Error al eliminar la meta.', 'danger');
      }
    } catch (err) {
      triggerToast('Error de conexión al eliminar la meta.', 'danger');
    }
  };

  // Export Data to CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      triggerToast('No hay transacciones para exportar.', 'warning');
      return;
    }

    const headers = 'ID,Tipo,Categoria,Monto,Fecha,Descripcion\n';
    const rows = transactions.map(tx => 
      `${tx.id},"${tx.type === 'income' ? 'Ingreso' : 'Egreso'}","${tx.category}",${tx.amount},"${tx.date}","${tx.description || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finflow_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Reporte exportado exitosamente como CSV.');
  };

  // Dynamic Statistics Calculations
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netWorth = totalIncome - totalExpense;

  const totalSavedInGoals = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const targetSavingsGoals = goals.reduce((sum, g) => sum + g.target_amount, 0);

  // Filter logic
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || tx.category === categoryFilter;
    const matchesType = typeFilter === 'All' || tx.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  // Calculate Last 4 Months Aggregates for Chart
  const getMonthlyDataForChart = () => {
    const monthlyStats = {};
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Default/Placeholder months to ensure chart looks premium even with low data
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    
    // Pre-populate last 4 months
    for (let i = 3; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      monthlyStats[label] = { label, income: 0, expense: 0 };
    }

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const label = `${months[txDate.getMonth()]} ${txDate.getFullYear().toString().substring(2)}`;
      if (monthlyStats[label]) {
        if (tx.type === 'income') monthlyStats[label].income += tx.amount;
        else monthlyStats[label].expense += tx.amount;
      }
    });

    return Object.values(monthlyStats);
  };

  const chartData = getMonthlyDataForChart();
  const maxChartVal = Math.max(...chartData.flatMap(d => [d.income, d.expense]), 100);

  // Categories list helper
  const expenseCategories = ['Alimentación', 'Alquiler', 'Servicios', 'Suscripciones', 'Entretenimiento', 'Transporte', 'Otros'];
  const incomeCategories = ['Sueldo', 'Freelance', 'Inversiones', 'Otros'];
  const allCategories = [...new Set([...incomeCategories, ...expenseCategories])];

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`} onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type !== 'success' && <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <PiggyBank size={24} />
          </div>
          <div>
            <h1 className="logo-text">FinFlow</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Panel de Control Financiero • AWS Linux Node</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-export" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Exportar CSV</span>
          </button>
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Metrics Cards */}
      <section className="metrics-grid animate-fade">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Balance de Cuenta</span>
            <DollarSign size={18} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: netWorth >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>
              ${netWorth.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className={`metric-trend ${netWorth >= 0 ? 'trend-positive' : 'trend-negative'}`}>
              {netWorth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{netWorth >= 0 ? 'Saldo Positivo' : 'Déficit'}</span>
            </div>
          </div>
        </div>

        <div className="glass-card metric-card income">
          <div className="metric-header">
            <span>Ingresos Totales</span>
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-success)' }}>
              ${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="metric-trend trend-positive">
              <span>Flujo positivo registrado</span>
            </div>
          </div>
        </div>

        <div className="glass-card metric-card expense">
          <div className="metric-header">
            <span>Egresos Totales</span>
            <TrendingDown size={18} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-danger)' }}>
              ${totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="metric-trend trend-negative">
              <span>Gastos del mes actual</span>
            </div>
          </div>
        </div>

        <div className="glass-card metric-card savings">
          <div className="metric-header">
            <span>Metas de Ahorro</span>
            <PiggyBank size={18} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-warning)' }}>
              ${totalSavedInGoals.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
              <span>de ${targetSavingsGoals.toLocaleString('es-ES')} proyectados</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p>Cargando datos desde AWS EC2...</p>
        </div>
      ) : (
        <div className="main-grid animate-slide">
          
          {/* Left Column: Charts and Transactions */}
          <div className="left-column">
            
            {/* Chart Card */}
            <div className="glass-card chart-card">
              <div className="chart-header">
                <h3 className="section-title">Análisis de Flujo de Caja</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Últimos 4 Meses</span>
              </div>
              <div className="chart-container">
                {chartData.map((data, idx) => {
                  const incHeight = (data.income / maxChartVal) * 100;
                  const expHeight = (data.expense / maxChartVal) * 100;
                  return (
                    <div key={idx} className="chart-bar-wrapper">
                      <div style={{ display: 'flex', gap: '4px', width: '100%', height: '100%', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {/* Income Bar */}
                        <div className="chart-bar-container">
                          <div 
                            className="chart-bar income" 
                            style={{ height: `${Math.max(incHeight, 3)}%` }}
                          />
                          <div className="chart-bar-tooltip">Ingresos: ${data.income.toFixed(2)}</div>
                        </div>
                        {/* Expense Bar */}
                        <div className="chart-bar-container">
                          <div 
                            className="chart-bar expense" 
                            style={{ height: `${Math.max(expHeight, 3)}%` }}
                          />
                          <div className="chart-bar-tooltip">Egresos: ${data.expense.toFixed(2)}</div>
                        </div>
                      </div>
                      <span className="chart-label">{data.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', fontSize: '0.8rem', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '12px', height: '12px', background: 'var(--color-success)', borderRadius: '3px' }} />
                  Ingresos
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '12px', height: '12px', background: 'var(--color-danger)', borderRadius: '3px' }} />
                  Egresos
                </span>
              </div>
            </div>

            {/* Transactions Card */}
            <div className="glass-card transactions-card">
              <h3 className="section-title">Registro de Transacciones</h3>
              
              {/* Filters */}
              <div className="filters-row">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Buscar por descripción..." 
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <select 
                  className="filter-select" 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="All">Todos los Tipos</option>
                  <option value="income">Ingresos</option>
                  <option value="expense">Egresos</option>
                </select>

                <select 
                  className="filter-select" 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">Todas las Categorías</option>
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* Transactions List */}
              <div className="transaction-list">
                {filteredTransactions.length === 0 ? (
                  <div className="empty-state">
                    <Info size={36} />
                    <p>No se encontraron transacciones con los filtros seleccionados.</p>
                  </div>
                ) : (
                  filteredTransactions.map(tx => (
                    <div key={tx.id} className="transaction-item">
                      <div className="item-left">
                        <div className={`transaction-icon-box ${tx.type}`}>
                          {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div className="item-details">
                          <span className="item-title">{tx.description || tx.category}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.15rem' }}>
                            <span className="category-badge">{tx.category}</span>
                            <span className="item-subtitle">
                              <Calendar size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                              {tx.date}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="item-right">
                        <span className={`item-amount ${tx.type}`}>
                          {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </span>
                        <button className="delete-btn" onClick={() => handleDeleteTransaction(tx.id)} title="Eliminar transacción">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Forms and Savings Goals */}
          <div className="right-column">
            
            {/* New Transaction Form */}
            <div className="glass-card">
              <h3 className="section-title">Nueva Transacción</h3>
              <form onSubmit={handleAddTransaction} className="elegant-form">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Tipo</label>
                    <select 
                      className="filter-select"
                      value={txForm.type}
                      onChange={(e) => setTxForm(prev => ({ ...prev, type: e.target.value, category: e.target.value === 'income' ? 'Sueldo' : 'Alimentación' }))}
                    >
                      <option value="expense">Egreso</option>
                      <option value="income">Ingreso</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Categoría</label>
                    <select 
                      className="filter-select"
                      value={txForm.category}
                      onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      {txForm.type === 'income' 
                        ? incomeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                        : expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Monto ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      className="form-input"
                      value={txForm.amount}
                      onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={txForm.date}
                      onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Descripción (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Compra de víveres" 
                    className="form-input"
                    value={txForm.description}
                    onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn-primary">
                  <Plus size={16} />
                  <span>Añadir Registro</span>
                </button>
              </form>
            </div>

            {/* Savings Goals Planner */}
            <div className="glass-card">
              <h3 className="section-title">Planificador de Ahorro</h3>
              
              {/* Goal List */}
              <div className="goals-list" style={{ marginBottom: '1.5rem' }}>
                {goals.length === 0 ? (
                  <div className="empty-state" style={{ padding: '1rem' }}>
                    <PiggyBank size={24} />
                    <p style={{ fontSize: '0.85rem' }}>No has creado metas de ahorro todavía.</p>
                  </div>
                ) : (
                  goals.map(goal => {
                    const percent = Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100);
                    return (
                      <div key={goal.id} className="goal-item">
                        <div className="goal-meta">
                          <span className="goal-title">{goal.name}</span>
                          <span className="goal-deadline">Meta: {goal.target_date}</span>
                        </div>
                        
                        <div className="goal-bar-bg">
                          <div className="goal-bar-fill" style={{ width: `${percent}%` }} />
                        </div>

                        <div className="goal-progress-info">
                          <span>${goal.current_amount.toFixed(0)} / ${goal.target_amount.toFixed(0)}</span>
                          <span>{percent}%</span>
                        </div>

                        <div className="goal-actions">
                          <div className="update-progress-form" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="number" 
                              placeholder="Monto"
                              className="update-input"
                              id={`update-val-${goal.id}`}
                              defaultValue={goal.current_amount}
                            />
                            <button 
                              className="btn-update-small"
                              onClick={() => {
                                const inputVal = document.getElementById(`update-val-${goal.id}`).value;
                                handleUpdateGoalProgress(goal.id, inputVal);
                              }}
                            >
                              Guardar
                            </button>
                          </div>
                          <button className="delete-btn" onClick={() => handleDeleteGoal(goal.id)} title="Eliminar meta">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Goal Mini-Form */}
              <form onSubmit={handleAddGoal} className="elegant-form" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nueva Meta</h4>
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Nombre de la meta (Ej. Auto nuevo)" 
                    className="form-input"
                    value={goalForm.name}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-row-2">
                  <input 
                    type="number" 
                    placeholder="Monto Objetivo ($)" 
                    className="form-input"
                    value={goalForm.target_amount}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_amount: e.target.value }))}
                    required
                  />
                  <input 
                    type="date" 
                    className="form-input"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--color-warning), #d97706)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                  <Plus size={16} />
                  <span>Añadir Meta</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)' }}>
        <p>&copy; {new Date().getFullYear()} FinFlow. Desarrollado para ambientes Linux Server AWS EC2 Free Tier.</p>
      </footer>
    </div>
  );
}
