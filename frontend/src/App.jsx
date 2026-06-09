import React, { useState, useEffect } from 'react';
import './App.css';
import logoImg from './assets/logo.png';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5001/api'
  : '/api';

const formatDateToTallyStyle = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day}-${months[monthIndex]}-${year}`;
    }
  }
  return dateStr;
};

function App() {
  // Session authentication state (persists across refresh)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('loggedInUser') || 'null'); } catch { return null; }
  });

  const [activeTab, setActiveTab] = useState('home');
  
  // Login input states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Global Date Range States — default to current month
  const _now = new Date();
  const _y = _now.getFullYear();
  const _m = String(_now.getMonth() + 1).padStart(2, '0');
  // Financial year: Apr 1 – Mar 31
  const _fyStartYear = _m >= '04' ? _y : _y - 1;
  const _first = `${_fyStartYear}-04-01`;
  const _last = `${_fyStartYear + 1}-03-31`;
  const _monthStr = `${_y}-${_m}`;

  const [fromDate, setFromDate] = useState(_first);
  const [toDate, setToDate] = useState(_last);

  // Date Picker Overlay States
  const [tempFromDate, setTempFromDate] = useState(_first);
  const [tempToDate, setTempToDate] = useState(_last);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempMonth, setTempMonth] = useState(_monthStr);

  // Download Dropdown Overlay States
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  // Profile Popover Overlay State
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Ledger Voucher States
  const [selectedLedger, setSelectedLedger] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerDropdownOpen, setLedgerDropdownOpen] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [voucherPage, setVoucherPage] = useState(1);
  const [ledgerOutstandingPage, setLedgerOutstandingPage] = useState(1);
  const [outstandingPage, setOutstandingPage] = useState(1);
  const VOUCHERS_PER_PAGE = 20;
  const [ledgerVouchers, setLedgerVouchers] = useState([]);
  const [isLoadingLedgerVouchers, setIsLoadingLedgerVouchers] = useState(false);
  const [ledgerVoucherError, setLedgerVoucherError] = useState('');
  const [voucherOpening, setVoucherOpening] = useState({ debit: 0, credit: 0 });
  const [voucherClosing, setVoucherClosing] = useState({ debit: 0, credit: 0 });

  // Ledger Outstanding States
  const [selectedOutstandingLedger, setSelectedOutstandingLedger] = useState('');
  const [outstandingSearchQuery, setOutstandingSearchQuery] = useState('');
  const [outstandingDropdownOpen, setOutstandingDropdownOpen] = useState(false);
  const [outstandingLedgerSearch, setOutstandingLedgerSearch] = useState('');
  const [ledgerOutstandings, setLedgerOutstandings] = useState([]);
  const [isLoadingLedgerOutstandings, setIsLoadingLedgerOutstandings] = useState(false);

  // Dynamic Ledger Master States from Tally
  const [ledgersList, setLedgersList] = useState([]);

  // Master modal & form control states
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingLedgerId, setEditingLedgerId] = useState(null);

  // Exact Form Field States from User Screenshots
  const [ledgerName, setLedgerName] = useState('');
  const [ledgerGroup, setLedgerGroup] = useState('');
  const [ledgerPersonName, setLedgerPersonName] = useState('');
  const [ledgerMobile, setLedgerMobile] = useState('');
  const [ledgerAddress, setLedgerAddress] = useState('');
  const [ledgerCity, setLedgerCity] = useState('');
  const [ledgerPincode, setLedgerPincode] = useState('');
  const [ledgerState, setLedgerState] = useState('');
  const [ledgerGstin, setLedgerGstin] = useState('');
  const [ledgerPanNo, setLedgerPanNo] = useState('');

  // Search filter matching user format
  const [masterSearch, setMasterSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);

  // User/Employee Management States
  const [usersList, setUsersList] = useState([]);

  const [empSearch, setEmpSearch] = useState('');
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empModalMode, setEmpModalMode] = useState('create'); // 'create' or 'edit'
  const [editingEmpId, setEditingEmpId] = useState(null);

  // Add Employee Form States
  const [empFullName, setEmpFullName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empAddress, setEmpAddress] = useState('');
  const [empCity, setEmpCity] = useState('');
  const [empState, setEmpState] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState('EMPLOYEE'); // 'EMPLOYEE' or 'ADMIN'
  const [empCashLedger, setEmpCashLedger] = useState('');
  const [empGroupLedger, setEmpGroupLedger] = useState('');
  const [empPermissions, setEmpPermissions] = useState([]);
  const [resetPwdModal, setResetPwdModal] = useState(false);
  const [resetPwdUserId, setResetPwdUserId] = useState(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetPwdShow, setResetPwdShow] = useState(false);
  const [empCashLedgerSearch, setEmpCashLedgerSearch] = useState('');
  const [empGroupLedgerSearch, setEmpGroupLedgerSearch] = useState('');
  const [empCashLedgerOpen, setEmpCashLedgerOpen] = useState(false);
  const [empGroupLedgerOpen, setEmpGroupLedgerOpen] = useState(false);

  // Transaction Tab States
  const [transactionType, setTransactionType] = useState('Receipt');
  const [transactionLedger, setTransactionLedger] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionRemark, setTransactionRemark] = useState('');
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [transactionLedgerSearchQuery, setTransactionLedgerSearchQuery] = useState('');
  const [transactionLedgerDropdownOpen, setTransactionLedgerDropdownOpen] = useState(false);

  // Transaction Report & Modal States
  const [tallyTransactions, setTallyTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState('');

  const [transactionError, setTransactionError] = useState('');

  // Outstanding (Group Summary) states
  const [outstandingRows, setOutstandingRows] = useState([]);
  const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(false);
  const [outstandingError, setOutstandingError] = useState('');
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [outstandingEffectiveFrom, setOutstandingEffectiveFrom] = useState('');
  const [outstandingEffectiveTo, setOutstandingEffectiveTo] = useState('');
  const [outstandingDateCapped, setOutstandingDateCapped] = useState(false);

  // Credit Sales states
  const [creditSales, setCreditSales] = useState([]);
  const [isLoadingCreditSales, setIsLoadingCreditSales] = useState(false);
  const [creditSalesSearch, setCreditSalesSearch] = useState('');

  // MD Sales states
  const [mdSales, setMdSales] = useState([]);
  const [isLoadingMdSales, setIsLoadingMdSales] = useState(false);
  const [mdSalesSearch, setMdSalesSearch] = useState('');
  const [mdModalOpen, setMdModalOpen] = useState(false);
  const [mdModalMode, setMdModalMode] = useState('create');
  const [editingMdId, setEditingMdId] = useState(null);
  const [mdDate, setMdDate] = useState('');
  const [mdVchType, setMdVchType] = useState('');
  const [mdParty, setMdParty] = useState('');
  const [mdAmount, setMdAmount] = useState('');
  const [mdFormError, setMdFormError] = useState('');
  const [mdSubmitting, setMdSubmitting] = useState(false);
  const [creditSaleModalOpen, setCreditSaleModalOpen] = useState(false);
  const [creditSaleModalMode, setCreditSaleModalMode] = useState('create');
  const [editingCreditSaleId, setEditingCreditSaleId] = useState(null);
  const [csVoucherNo, setCsVoucherNo] = useState('');
  const [csDate, setCsDate] = useState('');
  const [csParty, setCsParty] = useState('');
  const [csAmount, setCsAmount] = useState('');
  const [csFormError, setCsFormError] = useState('');
  const [csSubmitting, setCsSubmitting] = useState(false);
  // Payments panel
  const [selectedCreditSale, setSelectedCreditSale] = useState(null);
  const [salePayments, setSalePayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentVchType, setPaymentVchType] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const loadCreditSales = async () => {
    setIsLoadingCreditSales(true);
    try {
      const res = await fetch(`${API_BASE}/credit-sales`);
      const data = await res.json();
      if (data.success) setCreditSales(data.data || []);
    } catch (e) {
      // silently fail
    } finally {
      setIsLoadingCreditSales(false);
    }
  };

  const loadMdSales = async () => {
    setIsLoadingMdSales(true);
    try {
      const res = await fetch(`${API_BASE}/md-sales`);
      const data = await res.json();
      if (data.success) setMdSales(data.data || []);
    } catch (e) { /* silently fail */ }
    finally { setIsLoadingMdSales(false); }
  };

  const loadSalePayments = async (saleId) => {
    setIsLoadingPayments(true);
    setSalePayments([]);
    try {
      const res = await fetch(`${API_BASE}/credit-sales/${saleId}/payments`);
      const data = await res.json();
      if (data.success) setSalePayments(data.data || []);
    } catch (e) {
      // silently fail
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const loadOutstanding = async (from, to) => {
    setIsLoadingOutstanding(true);
    setOutstandingError('');
    try {
      const fmt = d => d ? d.replace(/-/g, '') : '';
      const reqFrom = fmt(from || fromDate);
      const reqTo   = fmt(to   || toDate);
      const params = new URLSearchParams({ fromDate: reqFrom, toDate: reqTo });
      const res = await fetch(`${API_BASE}/tally/outstanding?${params}`);
      const resData = await res.json();
      if (resData.success) {
        if (resData._debug) console.log('[Outstanding] debug:', resData._debug);
        setOutstandingRows(resData.data);
        setOutstandingEffectiveFrom(resData.fromDate || '');
        setOutstandingEffectiveTo(resData.toDate || '');
        // Flag if server capped the to-date (future date selected)
        const today = new Date();
        const pad = n => String(n).padStart(2,'0');
        const todayRaw = `${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;
        setOutstandingDateCapped(reqTo > todayRaw);
      } else {
        setOutstandingRows([]);
        setOutstandingError(resData.message || 'Failed to fetch outstanding from Tally.');
      }
    } catch (err) {
      setOutstandingRows([]);
      setOutstandingError('Could not connect to Tally. Please ensure Tally is running.');
    } finally {
      setIsLoadingOutstanding(false);
    }
  };

  const loadTallyTransactions = async (from, to) => {
    setIsLoadingTransactions(true);
    setTransactionError('');
    try {
      const fmt = d => d ? d.replace(/-/g, '') : '';
      const params = new URLSearchParams({ fromDate: fmt(from || fromDate), toDate: fmt(to || toDate) });
      const res = await fetch(`${API_BASE}/tally/transactions?${params}`);
      const resData = await res.json();
      if (resData.success) {
        setTallyTransactions(resData.data);
      } else {
        setTallyTransactions([]);
        setTransactionError(resData.message || 'Failed to fetch transactions from Tally.');
      }
    } catch (err) {
      setTallyTransactions([]);
      setTransactionError('Could not connect to Tally. Please ensure Tally is running.');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const [cashBookError, setCashBookError] = useState('');

  const loadCashBook = async (from, to, ledger) => {
    if (!ledger) { setReceiptsData([]); setPaymentsData([]); return; }
    setIsLoadingTransactions(true);
    setCashBookError('');
    try {
      const fmt = d => d ? d.replace(/-/g, '') : '';
      const params = new URLSearchParams({ fromDate: fmt(from), toDate: fmt(to) });
      const res = await fetch(`${API_BASE}/tally/vouchers/${encodeURIComponent(ledger)}?${params}`);
      const resData = await res.json();
      if (resData.success) {
        const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
        const parseD = s => { if (!s||s==='—') return null; const p=s.split('-'); if(p.length!==3) return null; let y=parseInt(p[2]); if(y<100)y+=2000; return new Date(y,months[p[1]],parseInt(p[0])); };
        const [fy,fm,fd] = (from||'').split('-').map(Number);
        const [ty,tm,td] = (to||'').split('-').map(Number);
        const fromD = fy ? new Date(fy,fm-1,fd) : null;
        const toD = ty ? new Date(ty,tm-1,td,23,59,59) : null;
        const vouchers = (resData.data || []).filter(v => {
          const d = parseD(v.date);
          if (!d) return true;
          if (fromD && d < fromD) return false;
          if (toD && d > toD) return false;
          return true;
        });
        setReceiptsData(vouchers.filter(v => (v.debit||0) > 0).map(v => ({ date: v.date, particulars: v.ledgerName||'—', amount: v.debit })));
        setPaymentsData(vouchers.filter(v => (v.credit||0) > 0).map(v => ({ date: v.date, particulars: v.ledgerName||'—', amount: v.credit })));
      } else {
        setReceiptsData([]);
        setPaymentsData([]);
        setCashBookError(resData.message || 'Failed to fetch from Tally.');
      }
    } catch (err) {
      setReceiptsData([]);
      setPaymentsData([]);
      setCashBookError('Could not connect to Tally. Please ensure Tally is running.');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const [cashBookDate, setCashBookDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  });

  // Pristine empty state ready for future Tally API connection
  const [receiptsData, setReceiptsData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);


  // Cash Book Opening Balance State (persists in localStorage)
  const [openingBalance, setOpeningBalance] = useState(() => {
    return parseFloat(localStorage.getItem('openingBalance')) || 0;
  });
  const [cashbookMobileTab, setCashbookMobileTab] = useState('debit');
  const [selectedCashLedger, setSelectedCashLedger] = useState('');
  const [cashLedgerSearch, setCashLedgerSearch] = useState('');
  const [cashLedgerDropdownOpen, setCashLedgerDropdownOpen] = useState(false);
  const [swipedUserId, setSwipedUserId] = useState(null);
  const swipeTouchStartX = React.useRef(null);

  useEffect(() => {
    localStorage.setItem('openingBalance', openingBalance.toString());
  }, [openingBalance]);

  // Load both ledgers and users/employees from the MySQL database
  const loadAllDataFromDb = async () => {
    try {
      console.log('Loading all records from local MySQL database...');
      // Fetch ledgers
      const ledgerRes = await fetch(`${API_BASE}/ledgers`);
      const ledgerData = await ledgerRes.json();
      if (ledgerData && ledgerData.success) {
        setLedgersList(ledgerData.data);
      }

      // Fetch users/employees
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = await usersRes.json();
      if (usersData && usersData.success) {
        setUsersList(usersData.data);
      }
    } catch (err) {
      console.error('Error fetching database records:', err);
    }
  };

  const [isSyncingLedgers, setIsSyncingLedgers] = useState(false);

  // Sync Ledger Master from Tally Server and update MySQL database
  const syncLedgersFromTally = async () => {
    setIsSyncingLedgers(true);
    try {
      console.log('Syncing live ledgers from Tally ERP to MySQL database...');
      const response = await fetch(`${API_BASE}/ledgers/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const resData = await response.json();
      if (resData && resData.success) {
        setLedgersList(resData.data);
        alert(resData.message || `Successfully synced ${resData.count} ledgers from Tally!`);
      } else {
        alert(`Tally Sync Failed: ${resData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error syncing with Tally:', err);
      alert('Tally Sync Server is offline or unreachable. Please run the backend service first.');
    } finally {
      setIsSyncingLedgers(false);
    }
  };

  // Sync automatically on user login / tab mount
  useEffect(() => {
    if (isLoggedIn) {
      loadAllDataFromDb();
    }
  }, [isLoggedIn]);

  // Load transactions automatically when tab is visited or date range changes
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'cash-book') {
      const cbLedger = isAdmin() ? selectedCashLedger : (loggedInUser?.cash_ledger || '');
      loadCashBook(cashBookDate, cashBookDate, cbLedger);
    } else if (activeTab === 'transaction') {
      loadTallyTransactions(fromDate, toDate);
    } else if (activeTab === 'outstanding') {
      loadOutstanding(fromDate, toDate);
    }
  }, [activeTab, isLoggedIn, fromDate, toDate, cashBookDate]);

  // Fetch vouchers for selected ledger
  const loadLedgerVouchers = async (from, to) => {
    if (!isLoggedIn || !selectedLedger) return;
    setIsLoadingLedgerVouchers(true);
    setLedgerVoucherError('');
    try {
      const fmt = d => d ? d.replace(/-/g, '') : '';
      const params = new URLSearchParams({ fromDate: fmt(from || fromDate), toDate: fmt(to || toDate) });
      const res = await fetch(`${API_BASE}/tally/vouchers/${encodeURIComponent(selectedLedger)}?${params}`);
      const resData = await res.json();
      if (resData && resData.success) {
        setLedgerVouchers(resData.data);
        setVoucherOpening(resData.opening || { debit: 0, credit: 0 });
        setVoucherClosing(resData.closing || { debit: 0, credit: 0 });
        if (resData._debug) console.log('[Vouchers] lvbody non-array fields:', resData._debug);
      } else {
        setLedgerVouchers([]);
        setVoucherOpening({ debit: 0, credit: 0 });
        setVoucherClosing({ debit: 0, credit: 0 });
        setLedgerVoucherError(resData.message || 'Failed to fetch vouchers from Tally.');
      }
    } catch (err) {
      setLedgerVouchers([]);
      setLedgerVoucherError('Could not connect to Tally.');
    } finally {
      setIsLoadingLedgerVouchers(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && selectedLedger) {
      loadLedgerVouchers(fromDate, toDate);
    } else {
      setLedgerVouchers([]);
    }
  }, [selectedLedger, isLoggedIn, fromDate, toDate]);

  // Fetch outstanding bills for selected outstanding ledger
  useEffect(() => {
    if (isLoggedIn && selectedOutstandingLedger) {
      const fetchLedgerOutstandings = async () => {
        setIsLoadingLedgerOutstandings(true);
        try {
          const fmt = d => d ? d.replace(/-/g, '') : '';
          const params = new URLSearchParams({ fromDate: fmt(fromDate), toDate: fmt(toDate) });
          const res = await fetch(`${API_BASE}/tally/outstanding/${encodeURIComponent(selectedOutstandingLedger)}?${params}`);
          const resData = await res.json();
          if (resData && resData.success) {
            setLedgerOutstandings(resData.data);
          }
        } catch (err) {
          console.error('Error fetching ledger outstandings:', err);
        } finally {
          setIsLoadingLedgerOutstandings(false);
        }
      };
      fetchLedgerOutstandings();
    } else {
      setLedgerOutstandings([]);
    }
  }, [selectedOutstandingLedger, isLoggedIn, fromDate, toDate]);

  // Auto-select first matching ledger for non-admin users when tab opens
  useEffect(() => {
    if (!isLoggedIn || isAdmin()) return;
    const userGroup = (loggedInUser?.group_ledger || '').trim().toLowerCase();
    if (!userGroup || !ledgersList.length) return;
    if (activeTab === 'ledger-voucher' && !selectedLedger) {
      const match = ledgersList.find(l => (l.group || '').trim().toLowerCase() === userGroup);
      if (match) setSelectedLedger(match.name);
    }
    if (activeTab === 'ledger-outstanding' && !selectedOutstandingLedger) {
      const match = ledgersList.find(l => (l.group || '').trim().toLowerCase() === userGroup);
      if (match) setSelectedOutstandingLedger(match.name);
    }
  }, [activeTab, ledgersList, isLoggedIn, loggedInUser]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (usernameInput === 'admin' && passwordInput === 'admin123') {
      const adminUser = { id: 0, name: 'Super Admin', username: 'admin', role: 'ADMIN', permissions: '', cash_ledger: '', group_ledger: '' };
      setIsLoggedIn(true);
      setLoggedInUser(adminUser);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loggedInUser', JSON.stringify(adminUser));
      setLoginError('');
      return;
    }
    if (usernameInput === 'admin') {
      setLoginError('Invalid username or password');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        setLoggedInUser(data.user);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loggedInUser', JSON.stringify(data.user));
        setLoginError('');
      } else {
        setLoginError('Invalid username or password');
      }
    } catch {
      setLoginError('Could not connect to server');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    setUsernameInput('');
    setPasswordInput('');
    setShowPassword(false);
    setProfilePopoverOpen(false);
  };

  const isAdmin = () => loggedInUser?.role === 'ADMIN' || loggedInUser?.username === 'admin';
  const hasPermission = (tabId) => {
    if (isAdmin()) return true;
    if (tabId === 'ledger-master') return false;
    return true;
  };

  // Dynamic sum calculators for totals footer
  const receiptsTotal = receiptsData.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const paymentsTotal = paymentsData.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const debitTotal = openingBalance + receiptsTotal;
  const closingBalance = debitTotal - paymentsTotal;
  const creditTotal = paymentsTotal + closingBalance;

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const renderPagination = (total, page, setPage, perPage = 20) => {
    if (total <= perPage) return null;
    const totalPages = Math.ceil(total / perPage);
    const btnStyle = (active, disabled) => ({
      padding: '5px 9px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: disabled ? 'default' : 'pointer', fontSize: '13px',
      background: active ? '#F9575C' : disabled ? '#f1f5f9' : '#fff',
      color: active ? '#fff' : disabled ? '#cbd5e0' : '#4a5568',
      fontWeight: active ? 'bold' : 'normal'
    });
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
      .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, []);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: '#a0aec0', marginRight: '6px' }}>{(page-1)*perPage+1}–{Math.min(page*perPage,total)} / {total}</span>
        <button style={btnStyle(false, page===1)} disabled={page===1} onClick={() => setPage(1)}>«</button>
        <button style={btnStyle(false, page===1)} disabled={page===1} onClick={() => setPage(p => p-1)}>‹</button>
        {pages.map((p, i) => p === '…' ? <span key={`e${i}`} style={{ fontSize: '13px', color: '#a0aec0', padding: '0 2px' }}>…</span> :
          <button key={p} style={btnStyle(page===p, false)} onClick={() => setPage(p)}>{p}</button>)}
        <button style={btnStyle(false, page===totalPages)} disabled={page===totalPages} onClick={() => setPage(p => p+1)}>›</button>
        <button style={btnStyle(false, page===totalPages)} disabled={page===totalPages} onClick={() => setPage(totalPages)}>»</button>
      </div>
    );
  };

  // Dynamic CSV trigger logic
  const triggerMockDownload = (format) => {
    setDownloadMenuOpen(false);
    
    // Choose active data name
    let filename = 'Report';
    let fileContent = '';

    if (activeTab === 'cash-book') {
      filename = 'Daily_Cash_Book_Report';
      fileContent = "AMOUNT,RECEIPTS (DEBIT),AMOUNT,PAYMENTS (CREDIT)\n";
      const totalLen = Math.max(receiptsData.length, paymentsData.length, 10);
      
      for (let i = 0; i < totalLen; i++) {
        const r = receiptsData[i] || {};
        const p = paymentsData[i] || {};
        fileContent += `${r.amount || ''},"${r.particulars || ''}",${p.amount || ''},"${p.particulars || ''}"\n`;
      }
      
      // Append sub-totals, opening balance, closing balance, and grand totals to the CSV
      fileContent += `${receiptsTotal},"Total Receipts",${paymentsTotal},"Total Payments"\n`;
      fileContent += `${openingBalance},"Opening Balance",,""\n`;
      fileContent += `,"",${closingBalance},"Closing Balance"\n`;
      fileContent += `${debitTotal},"Grand Total",${creditTotal},"Grand Total"\n`;
    } else {
      const activeLedger = activeTab === 'ledger-voucher' ? selectedLedger : selectedOutstandingLedger;
      filename = `${activeLedger || 'Ledger'}_Report`;
      fileContent = `Ledger Report: ${activeLedger || 'All Ledgers'}\nDate Range: ${fromDate} to ${toDate}\n\n`;
      fileContent += "Date,Particulars,Voucher Type,Voucher No,Debit,Credit\n";
      fileContent += "No transactions found inside this date range.\n";
    }

    const mimeType = format === 'excel' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
    const extension = format === 'excel' ? 'csv' : 'txt';

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.${extension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyDateRange = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setDatePickerOpen(false);
    // cash-book, transaction, outstanding reload via useEffect [fromDate, toDate]
    // ledger-voucher has no such useEffect — call explicitly
    if (activeTab === 'ledger-voucher') {
      loadLedgerVouchers(tempFromDate, tempToDate);
    }
  };

  const handleApplySingleDate = () => {
    setFromDate(tempFromDate);
    setToDate(tempFromDate);
    setDatePickerOpen(false);
  };

  const handleApplyMonth = () => {
    const [year, month] = tempMonth.split('-');
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    setFromDate(firstDay);
    setToDate(lastDayStr);
    setDatePickerOpen(false);
    if (activeTab === 'ledger-voucher') loadLedgerVouchers(firstDay, lastDayStr);
    if (activeTab === 'outstanding') loadOutstanding(firstDay, lastDayStr);
  };

  const formatMonthDisplay = (dateStr) => {
    if (!dateStr) return '';
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const parts = dateStr.split('-');
    return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  };

  const handleCancelDatePicker = () => {
    setTempFromDate(fromDate);
    setTempToDate(toDate);
    setTempMonth(fromDate ? fromDate.slice(0, 7) : '2026-04');
    setDatePickerOpen(false);
  };

  // Open modal for Create
  const openCreateModal = () => {
    setModalMode('create');
    setLedgerName('');
    setLedgerGroup('');
    setLedgerPersonName('');
    setLedgerMobile('');
    setLedgerAddress('');
    setLedgerCity('');
    setLedgerPincode('');
    setLedgerState('Assam');
    setLedgerGstin('');
    setLedgerPanNo('');
    setLedgerModalOpen(true);
  };

  // Open modal for Edit
  const openEditModal = (ledger) => {
    setModalMode('edit');
    setEditingLedgerId(ledger.id);
    setLedgerName(ledger.name);
    setLedgerGroup(ledger.group === '—' ? '' : ledger.group);
    setLedgerPersonName(ledger.personName === '—' ? '' : ledger.personName);
    setLedgerMobile(ledger.mobile === '—' ? '' : ledger.mobile);
    setLedgerAddress(ledger.address === '—' ? '' : ledger.address);
    setLedgerCity(ledger.city === '—' ? '' : ledger.city);
    setLedgerPincode(ledger.pincode === '—' ? '' : ledger.pincode);
    setLedgerState(ledger.state);
    setLedgerGstin(ledger.gstin === '—' ? '' : ledger.gstin);
    setLedgerPanNo(ledger.panNo === '—' ? '' : ledger.panNo);
    setLedgerModalOpen(true);
  };

  // Handle Create or Update submission in MySQL Database
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!ledgerName.trim()) return;

    const mappedLedger = {
      name: ledgerName.trim(),
      group: ledgerGroup.trim() || '—',
      beat: '—',
      personName: ledgerPersonName.trim() || '—',
      mobile: ledgerMobile.trim() || '—',
      address: ledgerAddress.trim() || '—',
      city: ledgerCity.trim() || '—',
      pincode: ledgerPincode.trim() || '—',
      state: ledgerState.trim() || 'Assam',
      gstin: ledgerGstin.trim() || '—',
      panNo: ledgerPanNo.trim() || '—'
    };

    try {
      if (modalMode === 'create') {
        const res = await fetch(`${API_BASE}/ledgers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedLedger)
        });
        const resData = await res.json();
        if (resData.success) {
          setLedgersList(prev => [...prev, { ...mappedLedger, id: resData.id }]);
        } else {
          alert(`Failed to create ledger: ${resData.message}`);
        }
      } else {
        const res = await fetch(`${API_BASE}/ledgers/${editingLedgerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedLedger)
        });
        const resData = await res.json();
        if (resData.success) {
          setLedgersList(prev => prev.map(l => l.id === editingLedgerId ? { ...l, ...mappedLedger } : l));
        } else {
          alert(`Failed to update ledger: ${resData.message}`);
        }
      }
    } catch (err) {
      console.error('Error submitting ledger:', err);
    }

    setLedgerModalOpen(false);
  };

  // Handle Delete with MySQL database deletion and confirmation
  const handleDeleteLedger = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ledger "${name}"?`)) {
      try {
        const res = await fetch(`${API_BASE}/ledgers/${id}`, {
          method: 'DELETE'
        });
        const resData = await res.json();
        if (resData.success) {
          setLedgersList(prev => prev.filter(l => l.id !== id));
          if (selectedLedger === name) setSelectedLedger('');
          if (selectedOutstandingLedger === name) setSelectedOutstandingLedger('');
        } else {
          alert(`Failed to delete ledger: ${resData.message}`);
        }
      } catch (err) {
        console.error('Error deleting ledger:', err);
      }
    }
  };

  // Open modal for Create Employee
  const openCreateEmpModal = () => {
    setEmpModalMode('create');
    setEmpFullName('');
    setEmpPhone('');
    setEmpEmail('');
    setEmpAddress('');
    setEmpCity('');
    setEmpState('');
    setEmpUsername('');
    setEmpPassword('');
    setEmpRole('EMPLOYEE');
    setEmpCashLedger('');
    setEmpGroupLedger('');
    setEmpCashLedgerSearch('');
    setEmpGroupLedgerSearch('');
    setEmpPermissions([]);
    setEmpModalOpen(true);
  };

  // Open modal for Edit Employee
  const openEditEmpModal = (emp) => {
    setEmpModalMode('edit');
    setEditingEmpId(emp.id);
    setEmpFullName(emp.name);
    setEmpPhone(emp.phone === '—' ? '' : emp.phone);
    setEmpEmail(emp.email === '—' ? '' : emp.email);
    setEmpAddress(emp.address === '—' ? '' : emp.address);
    setEmpCity(emp.city === '—' ? '' : emp.city);
    setEmpState(emp.state === '—' ? '' : emp.state);
    setEmpUsername(emp.username || '');
    setEmpPassword('');
    setEmpRole(emp.role);
    setEmpCashLedger(emp.cash_ledger || '');
    setEmpGroupLedger(emp.group_ledger || '');
    setEmpCashLedgerSearch('');
    setEmpGroupLedgerSearch('');
    try { setEmpPermissions(JSON.parse(emp.permissions || '[]')); } catch { setEmpPermissions([]); }
    setEmpModalOpen(true);
  };

  // Handle Create or Update Employee in MySQL database
  const handleEmpFormSubmit = async (e) => {
    e.preventDefault();
    if (!empFullName.trim()) return;

    let finalUsername = empUsername.trim();
    let finalPassword = empPassword.trim();

    // Generates a random Username and 6-digit Password if left blank
    if (!finalUsername) {
      finalUsername = empFullName.toLowerCase().replace(/\s+/g, '') + Math.floor(10 + Math.random() * 90);
    }
    if (!finalPassword) {
      finalPassword = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const mappedEmp = {
      name: empFullName.trim(),
      phone: empPhone.trim() || '—',
      email: empEmail.trim() || '—',
      address: empAddress.trim() || '—',
      city: empCity.trim() || '—',
      state: empState.trim() || '—',
      username: finalUsername,
      password: finalPassword,
      role: empRole,
      status: empModalMode === 'create' ? 'ACTIVE' : (usersList.find(u => u.id === editingEmpId)?.status || 'ACTIVE'),
      cash_ledger: empCashLedger,
      group_ledger: empGroupLedger,
      permissions: JSON.stringify(empPermissions)
    };

    try {
      if (empModalMode === 'create') {
        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedEmp)
        });
        const resData = await res.json();
        if (resData.success) {
          setUsersList(prev => [...prev, { ...mappedEmp, id: resData.id }]);
        } else {
          alert(`Failed to add employee: ${resData.message}`);
        }
      } else {
        const res = await fetch(`${API_BASE}/users/${editingEmpId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedEmp)
        });
        const resData = await res.json();
        if (resData.success) {
          setUsersList(prev => prev.map(u => u.id === editingEmpId ? { ...u, ...mappedEmp } : u));
        } else {
          alert(`Failed to update employee: ${resData.message}`);
        }
      }
    } catch (err) {
      console.error('Error submitting employee details:', err);
    }

    setEmpModalOpen(false);
  };

  const handleResetPassword = async () => {
    if (!resetPwdValue.trim()) return;
    try {
      await fetch(`${API_BASE}/users/${resetPwdUserId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPwdValue.trim() })
      });
      setResetPwdModal(false);
    } catch {}
  };

  // Toggle user active/inactive status in MySQL database
  const handleToggleEmpStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/toggle`, {
        method: 'PUT'
      });
      const resData = await res.json();
      if (resData.success) {
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: resData.newStatus } : u));
      } else {
        alert(`Failed to toggle employee status: ${resData.message}`);
      }
    } catch (err) {
      console.error('Error toggling employee status:', err);
    }
  };

  // Handle transaction submission to Tally
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!transactionLedger) {
      alert('Please select a Ledger Name.');
      return;
    }
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmittingTransaction(true);
    try {
      const response = await fetch(`${API_BASE}/tally/voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionType,
          ledgerName: transactionLedger,
          amount: parseFloat(transactionAmount),
          remark: transactionRemark
        })
      });

      const resData = await response.json();
      if (resData.success) {
        alert(resData.message || `Successfully posted ${transactionType} voucher to Tally!`);
        // Reset form
        setTransactionLedger('');
        setTransactionAmount('');
        setTransactionRemark('');
        setTransactionLedgerSearchQuery('');
        setTransactionModalOpen(false);
        loadTallyTransactions();
      } else {
        alert(`Failed to post voucher: ${resData.message || 'Unknown Tally Error'}`);
      }
    } catch (err) {
      console.error('Error posting transaction to Tally:', err);
      alert('Failed to connect to backend server or Tally is offline.');
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  // Close all open dropdowns on page/tab change
  useEffect(() => {
    setDatePickerOpen(false);
    setDownloadMenuOpen(false);
    setLedgerDropdownOpen(false);
    setOutstandingDropdownOpen(false);
    setProfilePopoverOpen(false);
    setTransactionLedgerDropdownOpen(false);
  }, [activeTab]);

  // Click outside to dismiss open dropdowns
  useEffect(() => {
    const handleGlobalClickOutside = (event) => {
      // Check if user clicked outside control button and overlay
      if (!event.target.closest('.controls-dropdown-container') && !event.target.closest('.ledger-icon-btn')) {
        setDatePickerOpen(false);
        setDownloadMenuOpen(false);
      }
      // Check if user clicked outside ledger dropdown lists
      if (!event.target.closest('.ledger-select-container')) {
        setLedgerDropdownOpen(false);
        setOutstandingDropdownOpen(false);
      }
      // Check if user clicked outside transaction ledger select container
      if (!event.target.closest('.transaction-ledger-select')) {
        setTransactionLedgerDropdownOpen(false);
      }
      // Check if user clicked outside profile avatar and popover card
      if (!event.target.closest('.profile-popover-container')) {
        setProfilePopoverOpen(false);
      }
    };

    document.addEventListener('click', handleGlobalClickOutside);
    return () => {
      document.removeEventListener('click', handleGlobalClickOutside);
    };
  }, []);

  useEffect(() => {
    const formatted = activeTab
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    document.title = isLoggedIn ? formatted : 'Login - Kashliwal Auto';
  }, [activeTab, isLoggedIn]);

  // Determine total rows needed for the report (minimum 10 rows for elegant spreadsheet grid layout)
  const totalRowsCount = Math.max(receiptsData.length, paymentsData.length, 3);

  // Search filter implementation matching "Search name, phone, GST..." format
  const filteredLedgers = ledgersList.filter(l =>
    l.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
    l.mobile.toLowerCase().includes(masterSearch.toLowerCase()) ||
    l.gstin.toLowerCase().includes(masterSearch.toLowerCase()) ||
    l.group.toLowerCase().includes(masterSearch.toLowerCase())
  );

  const LEDGERS_PER_PAGE = 20;
  const ledgerTotalPages = Math.max(1, Math.ceil(filteredLedgers.length / LEDGERS_PER_PAGE));
  const paginatedLedgers = filteredLedgers.slice((ledgerPage - 1) * LEDGERS_PER_PAGE, ledgerPage * LEDGERS_PER_PAGE);

  // Search filter for Tally transactions list
  const filteredTransactions = tallyTransactions.filter(tx => 
    tx.ledgerName.toLowerCase().includes(transactionSearch.toLowerCase()) ||
    tx.remark.toLowerCase().includes(transactionSearch.toLowerCase()) ||
    tx.type.toLowerCase().includes(transactionSearch.toLowerCase()) ||
    tx.date.toLowerCase().includes(transactionSearch.toLowerCase())
  );

  const parseTallyDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return null;
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const mon = months[parts[1]];
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    if (isNaN(day) || mon === undefined || isNaN(year)) return null;
    return new Date(year, mon, day);
  };

  const filteredVouchers = ledgerVouchers.filter(vch => {
    const vchDate = parseTallyDate(vch.date);
    if (vchDate && fromDate && toDate) {
      const [fy, fm, fd] = fromDate.split('-').map(Number);
      const [ty, tm, td] = toDate.split('-').map(Number);
      const from = new Date(fy, fm - 1, fd);
      const to = new Date(ty, tm - 1, td, 23, 59, 59);
      if (vchDate < from || vchDate > to) return false;
    }
    return (vch.remark || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vch.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vch.date || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vch.vchNo || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredOutstandings = ledgerOutstandings.filter(bill => {
    const billDate = parseTallyDate(bill.date);
    if (billDate && fromDate && toDate) {
      const [fy, fm, fd] = fromDate.split('-').map(Number);
      const [ty, tm, td] = toDate.split('-').map(Number);
      const from = new Date(fy, fm - 1, fd);
      const to = new Date(ty, tm - 1, td, 23, 59, 59);
      if (billDate < from || billDate > to) return false;
    }
    return (bill.refNo || '').toLowerCase().includes(outstandingSearchQuery.toLowerCase()) ||
      (bill.date || '').toLowerCase().includes(outstandingSearchQuery.toLowerCase());
  });

  // If not logged in, render the login page
  if (!isLoggedIn) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo-container">
            <img src={logoImg} alt="ABS Technologies Logo" className="login-logo-img" />
          </div>
          
          <div className="login-header">
            <h2>Kashliwal Auto</h2>
            <p>Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="login-input"
                placeholder="Enter username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  style={{ paddingRight: '36px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="login-error-message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {loginError}
              </div>
            )}

            <button type="submit" className="login-submit-btn">
              Sign In
            </button>
          </form>
          
          <div className="login-footer">
            <p>© 2026 ABS Technologies. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard layout once authenticated
  return (
    <div>
      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="modal-backdrop-overlay" style={{zIndex: 9999, position: 'fixed', inset: 0}}>
          <div className="modal-content-card animate-fade-in" style={{maxWidth: 360, padding: '32px 28px', textAlign: 'center'}}>
            <div style={{marginBottom: 12}}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3 style={{margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1a202c'}}>Logout</h3>
            <p style={{margin: '0 0 24px', color: '#718096', fontSize: 14}}>Are you sure you want to logout?</p>
            <div style={{display: 'flex', gap: 12, justifyContent: 'center'}}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{padding: '9px 28px', borderRadius: 8, border: '1px solid #cbd5e0', background: '#fff', color: '#4a5568', fontWeight: 600, cursor: 'pointer', fontSize: 14}}
              >Cancel</button>
              <button
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                style={{padding: '9px 28px', borderRadius: 8, border: 'none', background: '#e53e3e', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14}}
              >Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwdModal && (
        <div className="modal-backdrop-overlay" style={{zIndex: 9999, position: 'fixed', inset: 0}}>
          <div className="modal-content-card animate-fade-in" style={{maxWidth: 380, padding: '28px 28px 24px', textAlign: 'center'}}>
            <div style={{marginBottom: 10}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#805ad5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 style={{margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#1a202c'}}>Reset Password</h3>
            <p style={{margin: '0 0 18px', color: '#718096', fontSize: 13}}>Enter a new password for this user.</p>
            <div style={{position: 'relative', marginBottom: 20}}>
              <input
                type={resetPwdShow ? 'text' : 'password'}
                value={resetPwdValue}
                onChange={e => setResetPwdValue(e.target.value)}
                placeholder="New password"
                style={{width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e0', fontSize: 14, boxSizing: 'border-box', outline: 'none'}}
              />
              <span onClick={() => setResetPwdShow(v => !v)} style={{position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#a0aec0'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {resetPwdShow ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>}
                </svg>
              </span>
            </div>
            <div style={{display: 'flex', gap: 10, justifyContent: 'center'}}>
              <button onClick={() => setResetPwdModal(false)} style={{padding: '9px 26px', borderRadius: 8, border: '1px solid #cbd5e0', background: '#fff', color: '#4a5568', fontWeight: 600, cursor: 'pointer', fontSize: 14}}>Cancel</button>
              <button onClick={handleResetPassword} style={{padding: '9px 26px', borderRadius: 8, border: 'none', background: '#805ad5', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14}}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo-container">
            <img src={logoImg} alt="ABS Technologies Logo" className="logo-img" />
          </div>
          <div className="nav-tabs">
            <a href="#home" className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>Home</a>

            {isAdmin() && (
              <div className="nav-tab-dropdown">
                <button className={`nav-tab dropdown-trigger ${activeTab === 'ledger-master' ? 'active' : ''}`}>
                  Master
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div className="dropdown-menu">
                  <a href="#ledger-master" className={`dropdown-item ${activeTab === 'ledger-master' ? 'active' : ''}`} onClick={() => setActiveTab('ledger-master')}>Ledger Master</a>
                </div>
              </div>
            )}

            {(hasPermission('ledger-voucher') || hasPermission('ledger-outstanding')) && (
              <div className="nav-tab-dropdown">
                <button className={`nav-tab dropdown-trigger ${(activeTab === 'ledger-voucher' || activeTab === 'ledger-outstanding') ? 'active' : ''}`}>
                  Ledger
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div className="dropdown-menu">
                  {hasPermission('ledger-voucher') && <a href="#ledger-voucher" className={`dropdown-item ${activeTab === 'ledger-voucher' ? 'active' : ''}`} onClick={() => setActiveTab('ledger-voucher')}>Ledger Voucher</a>}
                  {hasPermission('ledger-outstanding') && <a href="#ledger-outstanding" className={`dropdown-item ${activeTab === 'ledger-outstanding' ? 'active' : ''}`} onClick={() => setActiveTab('ledger-outstanding')}>Ledger Outstanding</a>}
                </div>
              </div>
            )}

            {hasPermission('cash-book') && <a href="#cash-book" className={`nav-tab ${activeTab === 'cash-book' ? 'active' : ''}`} onClick={() => setActiveTab('cash-book')}>Cash Book</a>}
            {hasPermission('outstanding') && <a href="#outstanding" className={`nav-tab ${activeTab === 'outstanding' ? 'active' : ''}`} onClick={() => setActiveTab('outstanding')}>Outstanding</a>}
            {hasPermission('transaction') && <a href="#transaction" className={`nav-tab ${activeTab === 'transaction' ? 'active' : ''}`} onClick={() => setActiveTab('transaction')}>Transaction</a>}
            {isAdmin() && <a href="#credit-sales" className={`nav-tab ${activeTab === 'credit-sales' ? 'active' : ''}`} onClick={() => { setActiveTab('credit-sales'); loadCreditSales(); }}>Credit Sales</a>}
            {isAdmin() && <a href="#md-sales" className={`nav-tab ${activeTab === 'md-sales' ? 'active' : ''}`} onClick={() => { setActiveTab('md-sales'); loadMdSales(); }}>MD Sales</a>}
          </div>
        </div>

        <div className="nav-right">
          {/* Active Profile Info popover */}
          <div className="profile-popover-container">
            <div
              className={`profile-avatar ${profilePopoverOpen ? 'active' : ''}`}
              onClick={() => { if (!isAdmin()) { setActiveTab('my-profile'); } else { setProfilePopoverOpen(!profilePopoverOpen); } }}
              title="View Profile Info"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            
            {profilePopoverOpen && (
              <div className="profile-popover-overlay">
                <div className="profile-popover-header">
                  <div className="popover-avatar">
                    {(loggedInUser?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="popover-user-details">
                    <h4>{loggedInUser?.name || 'User'}</h4>
                    <span>@{loggedInUser?.username || ''}</span>
                  </div>
                </div>
                <div className="profile-popover-body">
                  <div className="popover-menu-list">
                    {/* Employee option — admin only */}
                    {isAdmin() ? (
                      <button
                        className={`popover-menu-item ${activeTab === 'users-management' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('users-management'); setProfilePopoverOpen(false); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Employee
                      </button>
                    ) : null}

                    {/* My Profile option */}
                    <button 
                      className={`popover-menu-item ${activeTab === 'my-profile' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab('my-profile');
                        setProfilePopoverOpen(false);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 12a4 4 0 0 0-8 0"></path>
                        <circle cx="12" cy="8" r="2"></circle>
                      </svg>
                      My Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="logout-icon-btn" onClick={() => setShowLogoutConfirm(true)} title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-container">
        
        {/* VIEW 1: Home Dashboard */}
        {activeTab === 'home' && (
          <>
            {/* Header Title */}
            <header className="dashboard-header">
              <h1>Good Morning, {loggedInUser?.name || 'User'}</h1>
              <p>Here's what's happening with your team today.</p>
            </header>

            {/* Minimal Stats Row utilizing the exact design and color theme */}
            <section className="top-row-grid">
              {/* Theme Card 1 - Black */}
              <div className="card-top navy">
                <div className="active-badge">
                  <span className="active-dot"></span>
                  STATUS
                </div>
                <div className="navy-value">Active</div>
                <div className="navy-footer">System is running smoothly</div>
              </div>

              {/* Theme Card 2 - Yellow Accent */}
              <div className="card-top">
                <div className="top-card-header">
                  <span className="top-card-title">PENDING TASKS</span>
                  <div className="top-card-icon yellow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </div>
                </div>
                <div className="top-card-value">0</div>
                <div className="top-card-footer">All caught up!</div>
                <div className="top-card-line yellow"></div>
              </div>

              {/* Theme Card 3 - Red Accent */}
              <div className="card-top">
                <div className="top-card-header">
                  <span className="top-card-title">NOTIFICATIONS</span>
                  <div className="top-card-icon red">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                </div>
                <div className="top-card-value">None</div>
                <div className="top-card-footer">No new alerts</div>
                <div className="top-card-line red"></div>
              </div>
            </section>
          </>
        )}

        {/* Ledger Sub-tabs — mobile only */}
        {(activeTab === 'ledger-voucher' || activeTab === 'ledger-outstanding') && (
          <div className="ledger-sub-tabs">
            <button
              className={`ledger-sub-tab ${activeTab === 'ledger-voucher' ? 'active' : ''}`}
              onClick={() => setActiveTab('ledger-voucher')}
            >
              Ledger Voucher
            </button>
            <button
              className={`ledger-sub-tab ${activeTab === 'ledger-outstanding' ? 'active' : ''}`}
              onClick={() => setActiveTab('ledger-outstanding')}
            >
              Ledger Outstanding
            </button>
          </div>
        )}

        {/* VIEW 2: Ledger Voucher */}
        {activeTab === 'ledger-voucher' && (
          <div className="ledger-voucher-view">
            {/* Dynamic Info Header bar */}
            {selectedLedger && (
              <div className="ledger-info-bar">
                <div className="ledger-info-left">
                  <span>Ledger:</span> <strong>{selectedLedger}</strong>
                </div>
                <div className="ledger-info-right">
                  {formatMonthDisplay(fromDate)}
                </div>
              </div>
            )}

            {/* Header Controls Row */}
            <div className="ledger-controls">
              {/* Custom Search Select Dropdown */}
              <div className={`ledger-select-container ${ledgerDropdownOpen ? 'open' : ''}`}>
                <div className="ledger-select-trigger" onClick={() => { setLedgerDropdownOpen(!ledgerDropdownOpen); setLedgerSearch(''); }}>
                  <svg className="select-icon-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span className={selectedLedger ? 'selected-text' : 'placeholder-text'}>
                    {selectedLedger || 'Select Ledger...'}
                  </span>
                  <svg className="select-arrow-right" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                {ledgerDropdownOpen && (
                  <div className="ledger-select-options">
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search ledger..."
                        value={ledgerSearch}
                        onChange={e => setLedgerSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    {ledgersList.filter(l => (isAdmin() || (l.group||'').trim().toLowerCase() === (loggedInUser?.group_ledger||'').trim().toLowerCase()) && l.name.toLowerCase().includes(ledgerSearch.toLowerCase())).map((ledger) => (
                      <div
                        key={ledger.id}
                        className={`ledger-select-option ${selectedLedger === ledger.name ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedLedger(ledger.name);
                          setLedgerDropdownOpen(false);
                          setLedgerSearch('');
                          setVoucherPage(1);
                        }}
                      >
                        {ledger.name}
                      </div>
                    ))}
                    {ledgersList.filter(l => (isAdmin() || (l.group||'').trim().toLowerCase() === (loggedInUser?.group_ledger||'').trim().toLowerCase()) && l.name.toLowerCase().includes(ledgerSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '10px 12px', color: '#a0aec0', fontSize: '13px' }}>No ledger found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="controls-dropdown-container">
                <button 
                  className={`ledger-icon-btn ${datePickerOpen ? 'active' : ''}`} 
                  title="Select Date Range"
                  onClick={() => setDatePickerOpen(!datePickerOpen)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                {datePickerOpen && (
                  <div className="date-range-picker-overlay">
                    <div className="date-input-group">
                      <label>Select Month</label>
                      <input
                        type="month"
                        value={tempMonth}
                        onChange={(e) => setTempMonth(e.target.value)}
                      />
                    </div>
                    <div className="date-picker-actions">
                      <button className="cancel-btn" onClick={handleCancelDatePicker}>Cancel</button>
                      <button className="apply-btn" onClick={handleApplyMonth}>Apply</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="controls-dropdown-container">
                <button 
                  className={`ledger-icon-btn ${downloadMenuOpen ? 'active' : ''}`} 
                  title="Download Excel/PDF"
                  onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                {downloadMenuOpen && (
                  <div className="download-dropdown-overlay">
                    <div className="download-item" onClick={() => triggerMockDownload('excel')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      Excel (.csv)
                    </div>
                    <div className="download-item" onClick={() => triggerMockDownload('pdf')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C53030" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      PDF (.txt)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search particulars Input */}
            <div className="particulars-search-bar">
              <svg className="search-bar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search particulars, type..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVoucherPage(1); }}
              />
            </div>

            {/* Table Header and Body based on selected state */}
            {!selectedLedger ? (
              /* Center Empty State: Select a Ledger */
              <div className="ledger-empty-state">
                <div className="empty-state-badge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h3>Select a Ledger</h3>
                <p>Please choose a ledger from the list to view its transaction history.</p>
                <button className="empty-state-action-btn" onClick={() => setLedgerDropdownOpen(true)}>
                  Choose Ledger
                </button>
              </div>
            ) : (
              /* Selected State: Table View */
              <div className="ledger-table-container">
                <div className="ledger-table-header desktop-only">
                  <div className="col-date">Date</div>
                  <div className="col-particulars">Particulars</div>
                  <div className="col-vch-type">Vch Type</div>
                  <div className="col-vch-no">Vch No.</div>
                  <div className="col-debit">Debit</div>
                  <div className="col-credit">Credit</div>
                </div>
                
                {isLoadingLedgerVouchers ? (
                  <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                    <div className="empty-state-badge">
                      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9575C" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" />
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                      </svg>
                    </div>
                    <h3>Loading Vouchers</h3>
                    <p>Fetching live transaction history from Tally ERP...</p>
                  </div>
                ) : ledgerVoucherError ? (
                  <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                    <h3 style={{ color: '#C53030', fontSize: '14px' }}>⚠ {ledgerVoucherError}</h3>
                    <p style={{ fontSize: '12px', color: '#718096' }}>Check the backend console for details.</p>
                  </div>
                ) : filteredVouchers.length === 0 ? (
                  <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                    <div className="empty-state-badge">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <circle cx="11.5" cy="14.5" r="2.5"></circle>
                        <line x1="16" y1="19" x2="13.25" y2="16.25"></line>
                      </svg>
                    </div>
                    <h3>No Vouchers Found</h3>
                    <p>We couldn't find any transactions for this specific date range.</p>
                  </div>
                ) : (
                  <>
                  <div className="ledger-table-body">
                    {filteredVouchers.slice((voucherPage - 1) * VOUCHERS_PER_PAGE, voucherPage * VOUCHERS_PER_PAGE).map((vch, idx) => {
                      const typeLower = (vch.type || '').toLowerCase();
                      const isDebit = vch.debit > 0 || typeLower === 'payment' || typeLower === 'sales' || typeLower === 'sale';
                      const isCredit = vch.credit > 0 || typeLower === 'receipt' || typeLower === 'purchase';
                      const displayAmount = vch.debit > 0
                        ? { value: vch.debit, side: 'Dr.' }
                        : vch.credit > 0
                          ? { value: vch.credit, side: 'Cr.' }
                          : isDebit
                            ? { value: vch.amount, side: 'Dr.' }
                            : isCredit
                              ? { value: vch.amount, side: 'Cr.' }
                              : { value: vch.amount, side: '' };
                      return (
                        <React.Fragment key={vch.id || idx}>
                          {/* Desktop table row */}
                          <div className="ledger-table-row desktop-only">
                            <div className="col-date">{vch.date}</div>
                            <div className="col-particulars" title={vch.ledgerName}>{vch.ledgerName || '—'}</div>
                            <div className="col-vch-type">
                              <span className="ledger-card-vch-badge" style={{
                                backgroundColor: isCredit ? 'rgba(72,187,120,0.15)' : isDebit ? 'rgba(245,101,101,0.15)' : 'rgba(226,232,240,0.15)',
                                color: isCredit ? '#38A169' : isDebit ? '#E53E3E' : '#4A5568',
                                border: `1px solid ${isCredit ? 'rgba(72,187,120,0.25)' : isDebit ? 'rgba(245,101,101,0.25)' : 'rgba(226,232,240,0.25)'}`,
                              }}>{vch.type}</span>
                            </div>
                            <div className="col-vch-no">#{vch.vchNo || '—'}</div>
                            <div className={`col-debit${isDebit && !isCredit ? ' dr' : ''}`}>{vch.debit > 0 ? formatCurrency(vch.debit) : (isDebit && !isCredit ? formatCurrency(vch.amount) : '')}</div>
                            <div className={`col-credit${isCredit ? ' cr' : ''}`}>{vch.credit > 0 ? formatCurrency(vch.credit) : (isCredit ? formatCurrency(vch.amount) : '')}</div>
                          </div>
                          {/* Mobile card row */}
                          <div className="ledger-card-row">
                            <div className="ledger-card-top">
                              <div className="ledger-card-name" title={vch.ledgerName}>{vch.ledgerName || '—'}</div>
                              <div className={`ledger-card-amount${isDebit && !isCredit ? ' dr' : isCredit ? ' cr' : ''}`}>
                                {formatCurrency(displayAmount.value)} {displayAmount.side}
                              </div>
                            </div>
                            <div className="ledger-card-bottom">
                              <span className="ledger-card-date">{vch.date}</span>
                              <span className="ledger-card-vch-badge" style={{
                                backgroundColor: isCredit ? 'rgba(72,187,120,0.15)' : isDebit ? 'rgba(245,101,101,0.15)' : 'rgba(226,232,240,0.15)',
                                color: isCredit ? '#38A169' : isDebit ? '#E53E3E' : '#4A5568',
                                border: `1px solid ${isCredit ? 'rgba(72,187,120,0.25)' : isDebit ? 'rgba(245,101,101,0.25)' : 'rgba(226,232,240,0.25)'}`,
                              }}>{vch.type}</span>
                              <span className="ledger-card-vch-no">#{vch.vchNo || '—'}</span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  {renderPagination(filteredVouchers.length, voucherPage, setVoucherPage)}
                  {/* Summary rows — matches Tally Ledger Vouchers format */}
                  {(() => {
                    // Use same display logic as per-row rendering so totals match what user sees
                    let totalDr = 0, totalCr = 0;
                    filteredVouchers.forEach(v => {
                      const tl = (v.type || '').toLowerCase();
                      const isD = v.debit > 0 || tl === 'payment' || tl === 'sales' || tl === 'sale';
                      const isC = v.credit > 0 || tl === 'receipt' || tl === 'purchase';
                      totalDr += v.debit > 0 ? v.debit : (isD ? v.amount : 0);
                      totalCr += v.credit > 0 ? v.credit : (isC ? v.amount : 0);
                    });
                    const summaryRow = (label, drVal, crVal, bg, topBorder) => (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: bg, borderTop: topBorder || '1px solid #e2e8f0', fontSize: '12.5px' }}>
                        <div style={{ flex: 1, textAlign: 'right', paddingRight: '16px', fontWeight: 600, color: '#4A5568' }}>{label}</div>
                        <div className="col-debit" style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 700, color: drVal > 0 ? '#C53030' : '#CBD5E0' }}>
                          {drVal > 0 ? formatCurrency(drVal) : '—'}
                        </div>
                        <div className="col-credit" style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 700, color: crVal > 0 ? '#2F855A' : '#CBD5E0' }}>
                          {crVal > 0 ? formatCurrency(crVal) : '—'}
                        </div>
                      </div>
                    );
                    // Closing = Opening + Net(Dr - Cr)
                    const openingNet = voucherOpening.debit - voucherOpening.credit;
                    const netChange  = totalDr - totalCr;
                    const closingNet = openingNet + netChange;
                    const closingDr  = closingNet > 0 ? closingNet : 0;
                    const closingCr  = closingNet < 0 ? Math.abs(closingNet) : 0;
                    return (
                      <>
                        {/* Desktop summary */}
                        <div className="desktop-only" style={{ borderTop: '2px solid #E2E8F0' }}>
                          {summaryRow('Opening Balance :', voucherOpening.debit, voucherOpening.credit, '#F7FAFC', 'none')}
                          {summaryRow('Current Total :', totalDr, totalCr, '#EBF8FF', '1px solid #BEE3F8')}
                          {summaryRow('Closing Balance :', closingDr, closingCr, '#F0FFF4', '1px solid #C6F6D5')}
                        </div>
                        {/* Mobile GRAND TOTAL — Tally style */}
                        <div className="ledger-grand-total-mobile">
                          <div className="lgt-header">GRAND TOTAL</div>
                          <div className="lgt-row">
                            <span className="lgt-label">Opening Bal</span>
                            <span className="lgt-value">{voucherOpening.debit > 0 ? formatCurrency(voucherOpening.debit) + ' Dr.' : voucherOpening.credit > 0 ? formatCurrency(voucherOpening.credit) + ' Cr.' : '—'}</span>
                          </div>
                          <div className="lgt-row">
                            <span className="lgt-label">Debit</span>
                            <span className="lgt-value dr">{formatCurrency(totalDr)}</span>
                          </div>
                          <div className="lgt-row">
                            <span className="lgt-label">Credit</span>
                            <span className="lgt-value cr">{formatCurrency(totalCr)}</span>
                          </div>
                          <div className="lgt-row closing">
                            <span className="lgt-label">Closing Bal ({closingDr > 0 ? 'Debit' : 'Credit'})</span>
                            <span className="lgt-value">{formatCurrency(closingDr > 0 ? closingDr : closingCr)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  </>

                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: Ledger Outstanding */}
        {activeTab === 'ledger-outstanding' && (
          <div className="ledger-voucher-view">
            {/* Dynamic Info Header bar */}
            {selectedOutstandingLedger && (
              <div className="ledger-info-bar">
                <div className="ledger-info-left">
                  <span>Ledger:</span> <strong>{selectedOutstandingLedger}</strong>
                </div>
                <div className="ledger-info-right">
                  {formatMonthDisplay(fromDate)}
                </div>
              </div>
            )}

            {/* Header Controls Row */}
            <div className="ledger-controls">
              {/* Custom Search Select Dropdown */}
              <div className={`ledger-select-container ${outstandingDropdownOpen ? 'open' : ''}`}>
                <div className="ledger-select-trigger" onClick={() => { setOutstandingDropdownOpen(!outstandingDropdownOpen); setOutstandingLedgerSearch(''); }}>
                  <svg className="select-icon-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span className={selectedOutstandingLedger ? 'selected-text' : 'placeholder-text'}>
                    {selectedOutstandingLedger || 'Select Ledger...'}
                  </span>
                  <svg className="select-arrow-right" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                {outstandingDropdownOpen && (
                  <div className="ledger-select-options">
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search ledger..."
                        value={outstandingLedgerSearch}
                        onChange={e => setOutstandingLedgerSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    {ledgersList.filter(l => (isAdmin() || (l.group||'').trim().toLowerCase() === (loggedInUser?.group_ledger||'').trim().toLowerCase()) && l.name.toLowerCase().includes(outstandingLedgerSearch.toLowerCase())).map((ledger) => (
                      <div
                        key={ledger.id}
                        className={`ledger-select-option ${selectedOutstandingLedger === ledger.name ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedOutstandingLedger(ledger.name);
                          setOutstandingDropdownOpen(false);
                          setOutstandingLedgerSearch('');
                        }}
                      >
                        {ledger.name}
                      </div>
                    ))}
                    {ledgersList.filter(l => (isAdmin() || (l.group||'').trim().toLowerCase() === (loggedInUser?.group_ledger||'').trim().toLowerCase()) && l.name.toLowerCase().includes(outstandingLedgerSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '10px 12px', color: '#a0aec0', fontSize: '13px' }}>No ledger found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="controls-dropdown-container">
                <button 
                  className={`ledger-icon-btn ${datePickerOpen ? 'active' : ''}`} 
                  title="Select Date Range"
                  onClick={() => setDatePickerOpen(!datePickerOpen)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                {datePickerOpen && (
                  <div className="date-range-picker-overlay">
                    <div className="date-input-group">
                      <label>Select Month</label>
                      <input
                        type="month"
                        value={tempMonth}
                        onChange={(e) => setTempMonth(e.target.value)}
                      />
                    </div>
                    <div className="date-picker-actions">
                      <button className="cancel-btn" onClick={handleCancelDatePicker}>Cancel</button>
                      <button className="apply-btn" onClick={handleApplyMonth}>Apply</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="controls-dropdown-container">
                <button 
                  className={`ledger-icon-btn ${downloadMenuOpen ? 'active' : ''}`} 
                  title="Download Excel/PDF"
                  onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                {downloadMenuOpen && (
                  <div className="download-dropdown-overlay">
                    <div className="download-item" onClick={() => triggerMockDownload('excel')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      Excel (.csv)
                    </div>
                    <div className="download-item" onClick={() => triggerMockDownload('pdf')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C53030" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      PDF (.txt)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search particulars Input */}
            <div className="particulars-search-bar">
              <svg className="search-bar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search particulars, type..."
                value={outstandingSearchQuery}
                onChange={(e) => { setOutstandingSearchQuery(e.target.value); setLedgerOutstandingPage(1); }}
              />
            </div>

            {/* Table Header and Body based on selected state */}
            {!selectedOutstandingLedger ? (
              /* Center Empty State: Select a Ledger */
              <div className="ledger-empty-state">
                <div className="empty-state-badge">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinecap="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h3>Select a Ledger</h3>
                <p>Please choose a ledger from the list to view its transaction history.</p>
                <button className="empty-state-action-btn" onClick={() => setOutstandingDropdownOpen(true)}>
                  Choose Ledger
                </button>
              </div>
            ) : (
              /* Selected State: Table View */
              <div className="ledger-table-container">
                <div className="ledger-table-header desktop-only">
                  <div className="col-date">Date</div>
                  <div className="col-ref-no">Ref. No.</div>
                  <div className="col-opening-amt">Opening Amt</div>
                  <div className="col-pending-amt">Pending Amt</div>
                  <div className="col-due-on">Due On</div>
                  <div className="col-overdue-days">Overdue</div>
                </div>
                
                {isLoadingLedgerOutstandings ? (
                  <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                    <div className="empty-state-badge">
                      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9575C" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" />
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                      </svg>
                    </div>
                    <h3>Loading Outstandings</h3>
                    <p>Fetching live outstanding bills from Tally ERP...</p>
                  </div>
                ) : filteredOutstandings.length === 0 ? (
                  <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                    <div className="empty-state-badge">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <circle cx="11.5" cy="14.5" r="2.5"></circle>
                        <line x1="16" y1="19" x2="13.25" y2="16.25"></line>
                      </svg>
                    </div>
                    <h3>No Bills Found</h3>
                    <p>No outstanding bills exist for this ledger.</p>
                  </div>
                ) : (
                  <>
                  {/* Desktop table rows */}
                  <div className="ledger-table-body desktop-only">
                    {filteredOutstandings.slice((ledgerOutstandingPage-1)*VOUCHERS_PER_PAGE, ledgerOutstandingPage*VOUCHERS_PER_PAGE).map((bill, idx) => (
                      <div key={bill.id || idx} className="ledger-table-row">
                        <div className="col-date">{bill.date || '—'}</div>
                        <div className="col-ref-no font-semibold text-slate-800" title={bill.refNo}>{bill.refNo || '—'}</div>
                        <div className="col-opening-amt font-bold" style={{ textAlign: 'right', color: bill.isDebit ? '#C53030' : '#2F855A' }}>
                          {formatCurrency(bill.openingAmt)}
                          <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>{bill.isDebit ? 'Dr' : 'Cr'}</span>
                        </div>
                        <div className="col-pending-amt font-extrabold" style={{ textAlign: 'right', color: bill.isDebit ? '#C53030' : '#2F855A' }}>
                          {formatCurrency(bill.pendingAmt)}
                          <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.7 }}>{bill.isDebit ? 'Dr' : 'Cr'}</span>
                        </div>
                        <div className="col-due-on" style={{ textAlign: 'center', fontSize: '13px' }}>{bill.isOnAccount ? '—' : (bill.dueOn || '—')}</div>
                        <div className="col-overdue-days" style={{ textAlign: 'center' }}>
                          {bill.isOnAccount ? (
                            <span style={{ color: '#a0aec0', fontSize: '12px' }}>On Account</span>
                          ) : (
                            <span className="profile-role-badge" style={{ backgroundColor: bill.overdueDays > 0 ? 'rgba(245,101,101,0.15)' : 'rgba(72,187,120,0.15)', color: bill.overdueDays > 0 ? '#E53E3E' : '#38A169', border: `1px solid ${bill.overdueDays > 0 ? 'rgba(245,101,101,0.25)' : 'rgba(72,187,120,0.25)'}`, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{bill.overdueDays} days</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile cards */}
                  <div className="outstanding-mobile-cards">
                    {filteredOutstandings.slice((ledgerOutstandingPage-1)*VOUCHERS_PER_PAGE, ledgerOutstandingPage*VOUCHERS_PER_PAGE).map((bill, idx) => (
                      <div key={bill.id || idx} className="outstanding-mobile-card">
                        {/* Row 1: Ref (left) | Pending Amt (right) */}
                        <div className="omc-row">
                          <div className="omc-ref">{bill.refNo || 'On Account'}</div>
                          <div className="omc-pending" style={{ color: bill.isDebit ? '#C53030' : '#2F855A' }}>
                            {formatCurrency(bill.pendingAmt)} {bill.isDebit ? 'Dr.' : 'Cr.'}
                          </div>
                        </div>
                        {/* Row 2: Date (left) | Opening Amt (right) */}
                        <div className="omc-row omc-row-sub">
                          <span className="omc-date">{bill.date || '—'}</span>
                          <span className="omc-opening" style={{ color: bill.isDebit ? '#C53030' : '#2F855A' }}>
                            Opn: {formatCurrency(bill.openingAmt)} {bill.isDebit ? 'Dr.' : 'Cr.'}
                          </span>
                        </div>
                        {/* Row 3: Due On (left) | Overdue badge (right) */}
                        <div className="omc-row omc-row-sub">
                          {bill.isOnAccount
                            ? <span className="omc-badge on-account">On Account</span>
                            : <span className="omc-due">Due: {bill.dueOn || '—'}</span>
                          }
                          {!bill.isOnAccount && (
                            <span className="omc-badge" style={{ backgroundColor: bill.overdueDays > 0 ? 'rgba(245,101,101,0.12)' : 'rgba(72,187,120,0.12)', color: bill.overdueDays > 0 ? '#E53E3E' : '#38A169' }}>
                              {bill.overdueDays > 0 ? `${bill.overdueDays}d overdue` : 'Current'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {renderPagination(filteredOutstandings.length, ledgerOutstandingPage, setLedgerOutstandingPage)}
                  {/* Totals row — desktop */}
                  {(() => {
                    const totOp  = filteredOutstandings.reduce((s, b) => s + (b.openingAmt || 0), 0);
                    const totPen = filteredOutstandings.reduce((s, b) => s + (b.pendingAmt || 0), 0);
                    return (
                      <>
                        <div className="desktop-only" style={{ display: 'flex', padding: '9px 12px', background: '#F8FAFC', borderTop: '2px solid #E2E8F0', fontSize: '12.5px', fontWeight: 700 }}>
                          <div className="col-date" />
                          <div className="col-ref-no" style={{ color: '#4A5568' }}>Total</div>
                          <div className="col-opening-amt" style={{ textAlign: 'right', paddingRight: '8px', color: '#C53030' }}>{formatCurrency(totOp)}</div>
                          <div className="col-pending-amt" style={{ textAlign: 'right', paddingRight: '8px', color: '#C53030' }}>{formatCurrency(totPen)}</div>
                          <div className="col-due-on" /><div className="col-overdue-days" />
                        </div>
                        <div className="omc-total-row">
                          <span>TOTAL PENDING</span>
                          <span>{formatCurrency(totPen)}</span>
                        </div>
                      </>
                    );
                  })()}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: Cash Book Double Entry & Denomination Sheet */}
        {activeTab === 'cash-book' && (
          <div className="cash-book-view">
            {/* Header controls row */}
            <div className="cash-book-header-row">
              <div className="cash-book-title-section">
                <h2>Daily Cash Book & Tally</h2>
                <span className="cash-book-subtitle">Date: {formatDateToTallyStyle(cashBookDate)}</span>
              </div>
              <div className="cash-book-controls">

                <div className="controls-dropdown-container">
                  <button
                    className={`ledger-icon-btn ${datePickerOpen ? 'active' : ''}`}
                    title="Select Date"
                    onClick={() => setDatePickerOpen(!datePickerOpen)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </button>
                  {datePickerOpen && (
                    <div className="date-range-picker-overlay">
                      <div className="date-input-group">
                        <label>Select Date</label>
                        <input
                          type="date"
                          value={cashBookDate}
                          onChange={(e) => setCashBookDate(e.target.value)}
                        />
                      </div>
                      <div className="date-picker-actions">
                        <button className="cancel-btn" onClick={() => setDatePickerOpen(false)}>Cancel</button>
                        <button className="apply-btn" onClick={() => { setDatePickerOpen(false); const cbLedger = isAdmin() ? selectedCashLedger : (loggedInUser?.cash_ledger || ''); loadCashBook(cashBookDate, cashBookDate, cbLedger); }}>Apply</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="controls-dropdown-container">
                  <button
                    className={`ledger-icon-btn ${downloadMenuOpen ? 'active' : ''}`}
                    title="Export Excel"
                    onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                  {downloadMenuOpen && (
                    <div className="download-dropdown-overlay">
                      <div className="download-item" onClick={() => triggerMockDownload('excel')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Excel (.csv)
                      </div>
                      <div className="download-item" onClick={() => triggerMockDownload('pdf')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C53030" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cash-in-hand ledger selector (admin only) */}
            {isAdmin() && <div style={{ padding: '4px 0 8px 0', position: 'relative' }}>
              <div style={{ position: 'relative', maxWidth: '340px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 10px', height: '36px', cursor: 'pointer', gap: '8px' }}
                  onClick={() => setCashLedgerDropdownOpen(o => !o)}
                >
                  <span style={{ flex: 1, fontSize: '13px', color: selectedCashLedger ? '#2D3748' : '#A0AEC0' }}>{selectedCashLedger || 'Select Ledger (Cash-in-hand)...'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                {cashLedgerDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 9999, marginTop: '2px', maxHeight: '220px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '6px 10px', borderBottom: '1px solid #F1F5F9' }}>
                      <input autoFocus type="text" placeholder="Search..." value={cashLedgerSearch} onChange={e => setCashLedgerSearch(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px' }} />
                    </div>
                    <div style={{ overflowY: 'auto' }}>
                      <div style={{ padding: '8px 12px', fontSize: '13px', color: '#A0AEC0', cursor: 'pointer' }}
                        onClick={() => { setSelectedCashLedger(''); setCashLedgerDropdownOpen(false); setCashLedgerSearch(''); setReceiptsData([]); setPaymentsData([]); }}>
                        — Default Cash Ledger —
                      </div>
                      {ledgersList.filter(l => (l.group||'').toLowerCase() === 'cash-in-hand' && l.name.toLowerCase().includes(cashLedgerSearch.toLowerCase())).map(l => (
                        <div key={l.id} style={{ padding: '8px 12px', fontSize: '13px', color: '#2D3748', cursor: 'pointer', background: selectedCashLedger === l.name ? '#FFF5F5' : 'transparent' }}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setSelectedCashLedger(l.name); setCashLedgerDropdownOpen(false); setCashLedgerSearch(''); loadCashBook(cashBookDate, cashBookDate, l.name); }}>
                          {l.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>}

            {/* Pristine Excel Accounting Grid Table */}
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th colSpan="2" className="text-center font-bold" style={{ fontSize: '10px', letterSpacing: '0.5px', color: '#1E293B', borderBottom: '1.5px solid #000000', borderRight: '1.5px solid #000000', height: '28px' }}>DEBIT (RECEIPTS)</th>
                    <th colSpan="2" className="text-center font-bold" style={{ fontSize: '10px', letterSpacing: '0.5px', color: '#1E293B', borderBottom: '1.5px solid #000000', height: '28px' }}>CREDIT (PAYMENTS)</th>
                  </tr>
                  <tr>
                    <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '30%', textAlign: 'left', borderRight: '1.5px solid #000000' }}>Particulars</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>Amount</th>
                    <th style={{ width: '30%', textAlign: 'left' }}>Particulars</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTransactions ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#A0AEC0', fontSize: '13px' }}>Fetching cash book from Tally...</td></tr>
                  ) : cashBookError ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#C53030', fontSize: '13px', background: '#FFF5F5' }}>⚠ {cashBookError}</td></tr>
                  ) : receiptsData.length === 0 && paymentsData.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#A0AEC0', fontSize: '13px' }}>{(isAdmin() ? selectedCashLedger : loggedInUser?.cash_ledger) ? 'No transactions found for the selected period' : 'Select a cash-in-hand ledger above to load data'}</td></tr>
                  ) : null}
                  {!isLoadingTransactions && Array.from({ length: totalRowsCount }).map((_, idx) => {
                    const receipt = receiptsData[idx] || null;
                    const payment = paymentsData[idx] || null;
                    return (
                      <tr key={idx}>
                        <td className="text-right font-medium">{receipt ? formatCurrency(receipt.amount) : ''}</td>
                        <td className="font-semibold text-left" style={{ borderRight: '1.5px solid #000000' }}>{receipt ? receipt.particulars : ''}</td>
                        <td className="text-right font-medium">{payment && payment.amount ? formatCurrency(payment.amount) : ''}</td>
                        <td className="font-semibold text-left">{payment ? payment.particulars : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <td className="text-right font-bold" style={{ borderTop: '1.5px solid #CBD5E1' }}>{formatCurrency(receiptsTotal)}</td>
                    <td className="text-left font-bold" style={{ color: '#475569', borderTop: '1.5px solid #CBD5E1', borderRight: '1.5px solid #000000' }}>Total Receipts</td>
                    <td className="text-right font-bold" style={{ borderTop: '1.5px solid #CBD5E1' }}>{formatCurrency(paymentsTotal)}</td>
                    <td className="text-left font-bold" style={{ color: '#475569', borderTop: '1.5px solid #CBD5E1' }}>Total Payments</td>
                  </tr>
                  <tr>
                    <td className="text-right font-bold" style={{ padding: 0, backgroundColor: '#F0FDF4' }}>
                      <input type="number" className="report-qty-input font-bold" style={{ textAlign: 'right', paddingRight: '8px', color: '#15803d', height: '24px', width: '100%', border: 'none', background: 'transparent' }} min="0" placeholder="0.00" value={openingBalance === 0 ? '' : openingBalance} onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="text-left font-bold" style={{ color: '#15803d', backgroundColor: '#F0FDF4', borderRight: '1.5px solid #000000' }}>Opening Balance (+)</td>
                    <td style={{ backgroundColor: '#F8FAFC' }}></td>
                    <td style={{ backgroundColor: '#F8FAFC' }}></td>
                  </tr>
                  <tr>
                    <td style={{ backgroundColor: '#F8FAFC' }}></td>
                    <td style={{ backgroundColor: '#F8FAFC', borderRight: '1.5px solid #000000' }}></td>
                    <td className="text-right font-bold" style={{ color: '#1D4ED8', backgroundColor: '#EFF6FF' }}>{formatCurrency(closingBalance)}</td>
                    <td className="text-left font-bold" style={{ color: '#1D4ED8', backgroundColor: '#EFF6FF' }}>Closing Balance (Calculated)</td>
                  </tr>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <td className="text-right font-bold" style={{ fontSize: '11.5px', borderTop: '1.5px solid #000000', borderBottom: '2px double #000000', color: '#000000' }}>{formatCurrency(debitTotal)}</td>
                    <td className="text-left font-bold" style={{ borderTop: '1.5px solid #000000', borderBottom: '2px double #000000', color: '#000000', borderRight: '1.5px solid #000000' }}>Grand Total</td>
                    <td className="text-right font-bold" style={{ fontSize: '11.5px', borderTop: '1.5px solid #000000', borderBottom: '2px double #000000', color: '#000000' }}>{formatCurrency(creditTotal)}</td>
                    <td className="text-left font-bold" style={{ borderTop: '1.5px solid #000000', borderBottom: '2px double #000000', color: '#000000' }}>Grand Total</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cash Book — tabbed */}
            <div className="cashbook-mobile">
              <div className="cbm-tabs">
                <button className={`cbm-tab ${cashbookMobileTab === 'debit' ? 'active debit' : ''}`} onClick={() => setCashbookMobileTab('debit')}>Debit (Receipts)</button>
                <button className={`cbm-tab ${cashbookMobileTab === 'credit' ? 'active credit' : ''}`} onClick={() => setCashbookMobileTab('credit')}>Credit (Payments)</button>
              </div>
              {isLoadingTransactions ? (
                <div className="cashbook-mobile-empty">Fetching cash book from Tally...</div>
              ) : cashBookError ? (
                <div className="cashbook-mobile-empty" style={{ color: '#C53030' }}>⚠ {cashBookError}</div>
              ) : (
                <>
                  {cashbookMobileTab === 'debit' && (
                    <>
                      {receiptsData.length === 0
                        ? <div className="cashbook-mobile-empty">No receipts — sync to load from Tally</div>
                        : receiptsData.map((r, i) => (
                          <div key={i} className="cbm-card">
                            <div className="cbm-card-top">
                              <span className="cbm-particulars">{r.particulars}</span>
                              <span className="cbm-amount receipts">{formatCurrency(r.amount)}</span>
                            </div>
                            <div className="cbm-date">{r.date}</div>
                          </div>
                        ))
                      }
                      <div className="cbm-summary">
                        <div className="cbm-summary-header receipts">DEBIT SUMMARY</div>
                        <div className="cbm-summary-row"><span>Total Receipts</span><span className="cbm-summary-dr">{formatCurrency(receiptsTotal)}</span></div>
                        <div className="cbm-summary-row">
                          <span>Opening Balance (+)</span>
                          <input type="number" className="cbm-opening-input" min="0" placeholder="0.00"
                            value={openingBalance === 0 ? '' : openingBalance}
                            onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="cbm-summary-row closing"><span>Grand Total</span><span>{formatCurrency(debitTotal)}</span></div>
                      </div>
                    </>
                  )}
                  {cashbookMobileTab === 'credit' && (
                    <>
                      {paymentsData.length === 0
                        ? <div className="cashbook-mobile-empty">No payments — sync to load from Tally</div>
                        : paymentsData.map((p, i) => (
                          <div key={i} className="cbm-card">
                            <div className="cbm-card-top">
                              <span className="cbm-particulars">{p.particulars}</span>
                              <span className="cbm-amount payments">{formatCurrency(p.amount)}</span>
                            </div>
                            <div className="cbm-date">{p.date}</div>
                          </div>
                        ))
                      }
                      <div className="cbm-summary">
                        <div className="cbm-summary-header payments">CREDIT SUMMARY</div>
                        <div className="cbm-summary-row"><span>Total Payments</span><span className="cbm-summary-cr">{formatCurrency(paymentsTotal)}</span></div>
                        <div className="cbm-summary-row"><span>Closing Balance</span><span className="cbm-summary-closing">{formatCurrency(closingBalance)}</span></div>
                        <div className="cbm-summary-row closing"><span>Grand Total</span><span>{formatCurrency(creditTotal)}</span></div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: Ledger Master Table (Matching User Design Format) */}
        {activeTab === 'ledger-master' && (
          <div className="ledger-master-view">
            
            {/* Top Toolbar: Magnifying Glass Search and Sync/Refresh Button */}
            <div className="master-toolbar-row">
              <div className="master-search-bar-full">
                <svg className="flex-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search name, phone, GST..."
                  value={masterSearch}
                  onChange={(e) => { setMasterSearch(e.target.value); setLedgerPage(1); }}
                />
              </div>

              <button
                className="master-sync-btn"
                title="Sync/Refresh"
                disabled={isSyncingLedgers}
                onClick={() => {
                  setMasterSearch('');
                  setLedgerPage(1);
                  syncLedgersFromTally();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSyncingLedgers ? '#A0AEC0' : '#4A5568'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isSyncingLedgers ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            </div>

            {/* Pristine Master Data Table Container */}
            <div className="master-grid-card desktop-only">
              <div className="master-table-wrapper">
                <table className="master-format-table">
                  <thead>
                    <tr>
                      <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                      <th className="sortable-header name-header" style={{ width: '36%' }}>
                        Name
                        <span className="sort-arrow red-arrow">↑</span>
                      </th>
                      <th className="sortable-header" style={{ width: '20%' }}>
                        Group
                        <span className="sort-arrow">⇅</span>
                      </th>
                      <th className="sortable-header" style={{ width: '14%' }}>
                        Phone
                        <span className="sort-arrow">⇅</span>
                      </th>
                      <th className="sortable-header" style={{ width: '14%' }}>
                        State
                        <span className="sort-arrow">⇅</span>
                      </th>
                      <th style={{ width: '12%' }}>GSTIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLedgers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="no-master-results">
                          No ledger records match your search query.
                        </td>
                      </tr>
                    ) : (
                      paginatedLedgers.map((ledger, idx) => (
                        <tr key={ledger.id}>
                          <td className="text-center font-medium text-slate-400">{(ledgerPage - 1) * LEDGERS_PER_PAGE + idx + 1}</td>
                          <td className="font-bold text-slate-800">{ledger.name}</td>
                          <td className="font-medium text-slate-500 uppercase">{ledger.group}</td>
                          <td className="text-slate-400">{ledger.mobile}</td>
                          <td className="text-slate-500">{ledger.state}</td>
                          <td className="font-medium text-slate-500">{ledger.gstin}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="master-mobile-cards">
              {paginatedLedgers.length === 0 ? (
                <div className="no-master-results">No ledger records match your search query.</div>
              ) : (
                paginatedLedgers.map((ledger) => (
                  <div key={ledger.id} className="master-mobile-card">
                    <div className="master-mobile-card-left">
                      <div className="master-mobile-card-name">{ledger.name}</div>
                      <div className="master-mobile-card-group">{ledger.group || '—'}</div>
                    </div>
                    <div className="master-mobile-card-right">
                      <div className="master-mobile-card-state">{ledger.state || '—'}</div>
                      <div className="master-mobile-card-gstin">{ledger.gstin || '—'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {ledgerTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', marginTop: '6px' }}>
                <span style={{ fontSize: '13px', color: '#718096' }}>
                  {filteredLedgers.length} ledgers
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                    disabled={ledgerPage === 1}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: ledgerPage === 1 ? '#F7FAFC' : '#fff', color: ledgerPage === 1 ? '#CBD5E0' : '#4A5568', cursor: ledgerPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500 }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A5568', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F7FAFC', minWidth: '70px', textAlign: 'center' }}>
                    {ledgerPage} / {ledgerTotalPages}
                  </span>
                  <button
                    onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))}
                    disabled={ledgerPage === ledgerTotalPages}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: ledgerPage === ledgerTotalPages ? '#F7FAFC' : '#fff', color: ledgerPage === ledgerTotalPages ? '#CBD5E0' : '#4A5568', cursor: ledgerPage === ledgerTotalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 500 }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Exact overlay modal matching Add Customer format */}
            {ledgerModalOpen && (
              <div className="modal-backdrop-overlay">
                <div className="modal-content-card customer-modal">
                  <div className="modal-header-row">
                    <h3>Add Customer</h3>
                    <button className="modal-close-btn" onClick={() => setLedgerModalOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleFormSubmit} className="modal-ledger-form">
                    <div className="modal-scroll-body">
                      {/* Row 1: Name * and Group */}
                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>Name *</label>
                          <input
                            type="text"
                            placeholder="Customer / shop name"
                            value={ledgerName}
                            onChange={(e) => setLedgerName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>Group</label>
                          <input
                            type="text"
                            placeholder="e.g. Retailer, Wholesaler"
                            value={ledgerGroup}
                            onChange={(e) => setLedgerGroup(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Row 2: Person Name (Full Width) */}
                      <div className="modal-form-field">
                        <label>Person Name</label>
                        <input
                          type="text"
                          placeholder="Contact person"
                          value={ledgerPersonName}
                          onChange={(e) => setLedgerPersonName(e.target.value)}
                        />
                      </div>

                      {/* Row 3: Mobile and Address */}
                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>Mobile</label>
                          <input
                            type="text"
                            placeholder="Mobile number"
                            value={ledgerMobile}
                            onChange={(e) => setLedgerMobile(e.target.value)}
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>Address</label>
                          <input
                            type="text"
                            placeholder="Street address"
                            value={ledgerAddress}
                            onChange={(e) => setLedgerAddress(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Row 4: City and Pincode */}
                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>City</label>
                          <input
                            type="text"
                            placeholder="City"
                            value={ledgerCity}
                            onChange={(e) => setLedgerCity(e.target.value)}
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>Pincode</label>
                          <input
                            type="text"
                            placeholder="6-digit"
                            value={ledgerPincode}
                            onChange={(e) => setLedgerPincode(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Row 5: State and GSTIN */}
                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>State</label>
                          <input
                            type="text"
                            placeholder="State"
                            value={ledgerState}
                            onChange={(e) => setLedgerState(e.target.value)}
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>GSTIN</label>
                          <input
                            type="text"
                            placeholder="e.g. 27AABCS1429B1Z1"
                            value={ledgerGstin}
                            onChange={(e) => setLedgerGstin(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Row 6: PAN No. (Full Width) */}
                      <div className="modal-form-field">
                        <label>PAN No.</label>
                        <input
                          type="text"
                          placeholder="e.g. AABCS1429B"
                          value={ledgerPanNo}
                          onChange={(e) => setLedgerPanNo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="modal-footer-actions">
                      <button 
                        type="button" 
                        className="modal-btn cancel-btn"
                        onClick={() => setLedgerModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="modal-btn submit-btn"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: User Management (Matching User Design Format) */}
        {activeTab === 'users-management' && (
          <div className="employee-management-view animate-fade-in">
            {/* Search input bar */}
            <div className="employee-search-bar">
              <svg className="flex-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
              />
            </div>

            {/* Employee Spreadsheet Table */}
            <div className="master-grid-card desktop-only">
              <div className="master-table-wrapper">
                <table className="master-format-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>EMPLOYEE NAME</th>
                      <th style={{ width: '20%' }}>PHONE NUMBER</th>
                      <th style={{ width: '15%' }}>ROLE</th>
                      <th style={{ width: '15%' }}>STATUS</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList
                      .filter(user => {
                        const searchLower = empSearch.toLowerCase();
                        return (
                          user.name.toLowerCase().includes(searchLower) ||
                          user.phone.includes(searchLower) ||
                          (user.username && user.username.toLowerCase().includes(searchLower))
                        );
                      })
                      .map((user) => (
                        <tr key={user.id}>
                          <td className="font-bold text-dark">{user.name}</td>
                          <td>{user.phone}</td>
                          <td>
                            <span className="employee-badge-role">
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span className="font-bold text-neutral-dark" style={{ color: '#4A5568' }}>
                              {user.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                className="action-btn edit-btn" 
                                title="Edit Details"
                                onClick={() => openEditEmpModal(user)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="action-btn"
                                title="Reset Password"
                                onClick={() => { setResetPwdUserId(user.id); setResetPwdValue(''); setResetPwdShow(false); setResetPwdModal(true); }}
                                style={{ color: '#805ad5', border: '1.5px solid #805ad5', background: '#faf5ff' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                              </button>
                              <button
                                className={`action-btn toggle-status-btn ${user.status === 'ACTIVE' ? 'active' : 'inactive'}`}
                                title={user.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                                onClick={() => handleToggleEmpStatus(user.id)}
                              >
                                {user.status === 'ACTIVE' ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                          No users created yet. Click the '+' button to add a new employee.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile employee cards with swipe-to-reveal actions */}
            <div className="emp-mobile-cards">
              <button className="emp-mobile-add-btn" onClick={openCreateEmpModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Staff
              </button>
              {usersList.filter(user => {
                const s = empSearch.toLowerCase();
                return user.name.toLowerCase().includes(s) || user.phone.includes(s) || (user.username && user.username.toLowerCase().includes(s));
              }).map((user) => (
                <div
                  key={user.id}
                  className="emp-swipe-wrapper"
                  onTouchStart={(e) => { swipeTouchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
                    if (dx < -50) setSwipedUserId(user.id);
                    else if (dx > 30) setSwipedUserId(null);
                  }}
                >
                  <div className={`emp-mobile-card ${swipedUserId === user.id ? 'swiped' : ''}`}>
                    <div className="emp-card-main">
                      <div className="emp-card-name">{user.name}</div>
                      <div className="emp-card-meta">
                        <span className="emp-card-phone">{user.phone}</span>
                        <span className="employee-badge-role">{user.role}</span>
                        <span className={`emp-card-status ${user.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{user.status}</span>
                      </div>
                    </div>
                    <div className="emp-card-actions">
                      <button className="emp-action-btn edit" onClick={() => { setSwipedUserId(null); openEditEmpModal(user); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button className={`emp-action-btn toggle ${user.status === 'ACTIVE' ? 'deactivate' : 'activate'}`} onClick={() => { setSwipedUserId(null); handleToggleEmpStatus(user.id); }}>
                        {user.status === 'ACTIVE' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {usersList.length === 0 && <div className="cashbook-mobile-empty">No users yet. Tap + to add an employee.</div>}
            </div>

            {/* Circular FAB Button in Bottom Right */}
            <button 
              className="floating-add-btn" 
              title="Add Employee"
              onClick={openCreateEmpModal}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 11h3V8h2v3h3v2H9v3H7v-3H4v-2z" />
                <circle cx="17" cy="9" r="4" />
                <path d="M11 19c0-3.3 2.7-6 6-6s6 2.7 6 6v1H11v-1z" />
              </svg>
            </button>

            {/* Add/Edit Employee Backdrop Dialog Modal */}
            {empModalOpen && (
              <div className="modal-backdrop-overlay">
                <div className="modal-content-card employee-modal animate-fade-in">
                  <div className="modal-header-row">
                    <h3>{empModalMode === 'create' ? 'Add Employee' : 'Edit Employee'}</h3>
                    <button className="modal-close-btn" onClick={() => setEmpModalOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleEmpFormSubmit} className="modal-employee-form">
                    <div className="modal-scroll-body">
                      {/* SECTION 1: BASIC INFORMATION */}
                      <div className="modal-section-title">Basic Information</div>
                      
                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>Full Name *</label>
                          <input
                            type="text"
                            placeholder="Enter full name"
                            value={empFullName}
                            onChange={(e) => setEmpFullName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>Phone</label>
                          <input
                            type="text"
                            placeholder="10-digit mobile number"
                            value={empPhone}
                            onChange={(e) => setEmpPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="modal-form-field">
                        <label>Email</label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={empEmail}
                          onChange={(e) => setEmpEmail(e.target.value)}
                        />
                      </div>

                      <div className="modal-form-field">
                        <label>Address</label>
                        <textarea
                          placeholder="Street address"
                          value={empAddress}
                          onChange={(e) => setEmpAddress(e.target.value)}
                        />
                      </div>

                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>City</label>
                          <input
                            type="text"
                            placeholder="City"
                            value={empCity}
                            onChange={(e) => setEmpCity(e.target.value)}
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>State</label>
                          <input
                            type="text"
                            placeholder="State"
                            value={empState}
                            onChange={(e) => setEmpState(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* SECTION 2: ACCOUNT CREDENTIALS (OPTIONAL) */}
                      <div className="modal-section-title">Account Credentials (Optional)</div>
                      <div className="modal-section-subtitle">
                        If left blank, a random Username and 6-digit Password will be generated.
                      </div>

                      <div className="modal-form-row">
                        <div className="modal-form-field">
                          <label>Username</label>
                          <input
                            type="text"
                            placeholder="e.g. jai47"
                            value={empUsername}
                            onChange={(e) => setEmpUsername(e.target.value)}
                          />
                        </div>
                        <div className="modal-form-field">
                          <label>Password</label>
                          <input
                            type="text"
                            placeholder="Min 6 chars"
                            value={empPassword}
                            onChange={(e) => setEmpPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* SECTION 3: LEDGER ASSIGNMENT */}
                      <div className="modal-section-title">Ledger Assignment</div>
                      <div className="modal-form-row">
                        {/* Cash Ledger */}
                        <div className="modal-form-field" style={{ position: 'relative' }}>
                          <label>Cash Ledger</label>
                          <input
                            type="text"
                            placeholder="Search & select cash ledger..."
                            value={empCashLedger || empCashLedgerSearch}
                            onChange={e => { setEmpCashLedger(''); setEmpCashLedgerSearch(e.target.value); setEmpCashLedgerOpen(true); }}
                            onFocus={() => setEmpCashLedgerOpen(true)}
                            autoComplete="off"
                          />
                          {empCashLedger && (
                            <button type="button" onClick={() => { setEmpCashLedger(''); setEmpCashLedgerSearch(''); }} style={{ position: 'absolute', right: '8px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: '#A0AEC0', fontSize: '16px' }}>×</button>
                          )}
                          {empCashLedgerOpen && (
                            <div className="emp-ledger-dropdown" onMouseDown={e => e.preventDefault()}>
                              {ledgersList.filter(l => (l.group || '').toLowerCase() === 'cash-in-hand' && l.name.toLowerCase().includes(empCashLedgerSearch.toLowerCase())).slice(0, 50).map(l => (
                                <div key={l.id} className="emp-ledger-dropdown-item" onClick={() => { setEmpCashLedger(l.name); setEmpCashLedgerSearch(''); setEmpCashLedgerOpen(false); }}>
                                  {l.name}
                                </div>
                              ))}
                              {ledgersList.filter(l => (l.group || '').toLowerCase() === 'cash-in-hand' && l.name.toLowerCase().includes(empCashLedgerSearch.toLowerCase())).length === 0 && (
                                <div className="emp-ledger-dropdown-empty">No cash-in-hand ledgers found</div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Group Ledger */}
                        <div className="modal-form-field" style={{ position: 'relative' }}>
                          <label>Group Ledger</label>
                          <input
                            type="text"
                            placeholder="Search & select group ledger..."
                            value={empGroupLedger || empGroupLedgerSearch}
                            onChange={e => { setEmpGroupLedger(''); setEmpGroupLedgerSearch(e.target.value); setEmpGroupLedgerOpen(true); }}
                            onFocus={() => setEmpGroupLedgerOpen(true)}
                            autoComplete="off"
                          />
                          {empGroupLedger && (
                            <button type="button" onClick={() => { setEmpGroupLedger(''); setEmpGroupLedgerSearch(''); }} style={{ position: 'absolute', right: '8px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: '#A0AEC0', fontSize: '16px' }}>×</button>
                          )}
                          {empGroupLedgerOpen && (
                            <div className="emp-ledger-dropdown" onMouseDown={e => e.preventDefault()}>
                              {[...new Set(ledgersList.map(l => l.group).filter(g => g && g !== '—'))].filter(g => g.toLowerCase().includes(empGroupLedgerSearch.toLowerCase())).sort().map(g => (
                                <div key={g} className="emp-ledger-dropdown-item" onClick={() => { setEmpGroupLedger(g); setEmpGroupLedgerSearch(''); setEmpGroupLedgerOpen(false); }}>
                                  {g}
                                </div>
                              ))}
                              {[...new Set(ledgersList.map(l => l.group).filter(g => g && g !== '—'))].filter(g => g.toLowerCase().includes(empGroupLedgerSearch.toLowerCase())).length === 0 && (
                                <div className="emp-ledger-dropdown-empty">No groups found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SECTION 4: ROLE */}
                      <div className="modal-section-title">Role</div>
                      <div className="role-toggle-row">
                        <button
                          type="button"
                          className={`role-toggle-btn ${empRole === 'EMPLOYEE' ? 'active' : 'inactive'}`}
                          onClick={() => setEmpRole('EMPLOYEE')}
                        >
                          Employee
                        </button>
                        <button
                          type="button"
                          className={`role-toggle-btn ${empRole === 'ADMIN' ? 'active' : 'inactive'}`}
                          onClick={() => setEmpRole('ADMIN')}
                        >
                          Admin
                        </button>
                      </div>
                    </div>


                    {/* Submit Button */}
                    <div style={{ padding: '14px 0 20px', borderTop: '1px solid #F1F5F9', marginTop: '8px', flexShrink: 0 }}>
                      <button type="submit" className="modal-full-submit-btn" style={{ margin: 0 }}>
                        {empModalMode === 'create' ? 'Create Employee' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 7: My Profile (Active Admin Profile section) */}
        {activeTab === 'my-profile' && (
          <div className="my-profile-view animate-fade-in">
            <div className="profile-dashboard-card">
              <div className="profile-card-header">
                <div className="large-profile-avatar">
                  {(loggedInUser?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="profile-card-title">
                  <h2>{loggedInUser?.name || '—'}</h2>
                  <p className="profile-username">@{loggedInUser?.username || ''}</p>
                  <span className="profile-role-badge">{isAdmin() ? 'Super Administrator' : 'Employee'}</span>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{loggedInUser?.name || '—'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{loggedInUser?.email || '—'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Phone Number</span>
                  <span className="detail-value">{loggedInUser?.phone ? `+91 ${loggedInUser.phone}` : '—'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Company System</span>
                  <span className="detail-value font-semibold">Kashliwal Auto</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Account Status</span>
                  <span className="detail-value text-green-500 font-bold">{loggedInUser?.status === 'ACTIVE' ? 'Active / Online' : (loggedInUser?.status || 'Active / Online')}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="detail-label">Permission Level</span>
                  <span className="detail-value text-rose-500 font-bold">{isAdmin() ? 'Full Root Access' : 'Limited Access'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Outstanding — Group Summary from Tally */}
        {activeTab === 'outstanding' && (
          <div className="ledger-voucher-view">
            {/* Info bar */}
            <div className="ledger-info-bar">
              <div className="ledger-info-left">
                <span>Outstanding</span> <strong>Group Summary</strong>
              </div>
              <div className="ledger-info-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {formatMonthDisplay(fromDate)}
              </div>
            </div>

            {/* Single controls row: search + calendar + sync */}
            <div className="ledger-controls" style={{ gap: '8px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 10px', height: '36px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search account name..."
                  value={outstandingSearch}
                  onChange={e => { setOutstandingSearch(e.target.value); setOutstandingPage(1); }}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent', color: '#2D3748' }}
                />
              </div>
              <div className="controls-dropdown-container">
                <button
                  className={`ledger-icon-btn ${datePickerOpen ? 'active' : ''}`}
                  title="Select Date Range"
                  onClick={() => setDatePickerOpen(!datePickerOpen)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                {datePickerOpen && (
                  <div className="date-range-picker-overlay">
                    <div className="date-input-group">
                      <label>Select Month</label>
                      <input type="month" value={tempMonth} onChange={e => setTempMonth(e.target.value)} />
                    </div>
                    <div className="date-picker-actions">
                      <button className="cancel-btn" onClick={handleCancelDatePicker}>Cancel</button>
                      <button className="apply-btn" onClick={handleApplyMonth}>Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <button
                className="ledger-icon-btn"
                title="Refresh from Tally"
                onClick={() => loadOutstanding(fromDate, toDate)}
                disabled={isLoadingOutstanding}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isLoadingOutstanding ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="ledger-table-container">
              <div className="ledger-table-header desktop-only">
                <div style={{ width: '4%', textAlign: 'center', color: '#A0AEC0' }}>#</div>
                <div style={{ width: '56%' }}>Account Name</div>
                <div style={{ width: '20%', textAlign: 'right', paddingRight: '8px' }}>Debit (Dr)</div>
                <div style={{ width: '20%', textAlign: 'right', paddingRight: '8px' }}>Credit (Cr)</div>
              </div>

              {isLoadingOutstanding ? (
                <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                  <div className="empty-state-badge">
                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F9575C" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                    </svg>
                  </div>
                  <h3>Loading Group Summary</h3>
                  <p>Fetching outstanding data from Tally ERP...</p>
                </div>
              ) : outstandingError ? (
                <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                  <h3 style={{ color: '#C53030', fontSize: '14px' }}>⚠ {outstandingError}</h3>
                </div>
              ) : outstandingRows.length === 0 ? (
                <div className="ledger-empty-state inside-table" style={{ padding: '40px 0' }}>
                  <h3>No Data</h3>
                  <p>Click the refresh button to load from Tally.</p>
                </div>
              ) : (
                <>
                  {(() => {
                    const filtered = outstandingRows.filter(r => {
                      const groupOk = isAdmin() || ledgersList.some(l => l.name === r.name && (l.group || '').trim().toLowerCase() === (loggedInUser?.group_ledger || '').trim().toLowerCase());
                      return groupOk && r.name.toLowerCase().includes(outstandingSearch.toLowerCase());
                    });
                    const totalDr = filtered.reduce((s, r) => s + r.debit, 0);
                    const totalCr = filtered.reduce((s, r) => s + r.credit, 0);
                    const paged = filtered.slice((outstandingPage-1)*VOUCHERS_PER_PAGE, outstandingPage*VOUCHERS_PER_PAGE);
                    return (
                      <>
                        {/* Desktop rows */}
                        <div className="ledger-table-body desktop-only">
                          {paged.map((row, idx) => (
                            <div key={idx} className="ledger-table-row">
                              <div style={{ width: '4%', textAlign: 'center', color: '#A0AEC0', fontSize: '12px' }}>{(outstandingPage-1)*VOUCHERS_PER_PAGE + idx + 1}</div>
                              <div style={{ width: '56%', fontWeight: 500, fontSize: '13px' }}>{row.name}</div>
                              <div style={{ width: '20%', textAlign: 'right', paddingRight: '8px', fontWeight: 600, color: row.debit > 0 ? '#C53030' : '#CBD5E0' }}>
                                {row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                              </div>
                              <div style={{ width: '20%', textAlign: 'right', paddingRight: '8px', fontWeight: 600, color: row.credit > 0 ? '#2F855A' : '#CBD5E0' }}>
                                {row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Mobile cards */}
                        <div className="os-mobile-cards">
                          {paged.map((row, idx) => (
                            <div key={idx} className="os-mobile-card">
                              <div className="os-card-name">{row.name}</div>
                              <div className="os-card-amounts">
                                <div className="os-card-col">
                                  <span className="os-col-label">Debit (Dr)</span>
                                  <span className="os-col-value dr">{row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</span>
                                </div>
                                <div className="os-card-divider" />
                                <div className="os-card-col right">
                                  <span className="os-col-label">Credit (Cr)</span>
                                  <span className="os-col-value cr">{row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {renderPagination(filtered.length, outstandingPage, setOutstandingPage)}

                        {/* Desktop summary */}
                        {(() => {
                          const closingNet = totalDr - totalCr;
                          const closingDr  = closingNet > 0 ? closingNet : 0;
                          const closingCr  = closingNet < 0 ? Math.abs(closingNet) : 0;
                          const summaryRow = (label, dr, cr, bg, border) => (
                            <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: bg, borderTop: border, fontSize: '12.5px' }}>
                              <div style={{ flex: 1, textAlign: 'right', paddingRight: '16px', fontWeight: 600, color: '#4A5568' }}>{label}</div>
                              <div style={{ width: '20%', textAlign: 'right', paddingRight: '8px', fontWeight: 700, color: dr > 0 ? '#C53030' : '#CBD5E0' }}>{dr > 0 ? dr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</div>
                              <div style={{ width: '20%', textAlign: 'right', paddingRight: '8px', fontWeight: 700, color: cr > 0 ? '#2F855A' : '#CBD5E0' }}>{cr > 0 ? cr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</div>
                            </div>
                          );
                          return (
                            <>
                              <div className="desktop-only" style={{ borderTop: '2px solid #E2E8F0' }}>
                                {summaryRow('Opening Balance :', 0, 0, '#F7FAFC', 'none')}
                                {summaryRow('Current Total :', totalDr, totalCr, '#EBF8FF', '1px solid #BEE3F8')}
                                {summaryRow('Closing Balance :', closingDr, closingCr, '#F0FFF4', '1px solid #C6F6D5')}
                              </div>
                              {/* Mobile summary */}
                              <div className="os-mobile-summary">
                                <div className="os-summary-header">GRAND TOTAL</div>
                                <div className="os-summary-row"><span>Total Debit</span><span className="os-summary-dr">{totalDr > 0 ? totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</span></div>
                                <div className="os-summary-row"><span>Total Credit</span><span className="os-summary-cr">{totalCr > 0 ? totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}</span></div>
                                <div className="os-summary-row closing">
                                  <span>Closing ({closingDr > 0 ? 'Dr' : 'Cr'})</span>
                                  <span>{(closingDr > 0 ? closingDr : closingCr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* VIEW 8: Transaction Report Register (Not stored in local DB, loaded dynamically from Tally) */}
        {activeTab === 'transaction' && (
          <div className="ledger-master-view">
            
            {/* Top Toolbar: Magnifying Glass Search, Refresh, and green Add Transaction button */}
            <div className="master-toolbar-row">
              <div className="master-search-bar-full">
                <svg className="flex-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search Tally transactions..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="master-sync-btn" 
                  title="Sync/Refresh Vouchers"
                  onClick={() => {
                    setTransactionSearch('');
                    loadTallyTransactions(fromDate, toDate);
                  }}
                  disabled={isLoadingTransactions}
                >
                  <svg className={isLoadingTransactions ? "animate-spin" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                </button>

                <button 
                  className="add-transaction-trigger-btn animate-button" 
                  onClick={() => {
                    setTransactionType('Receipt');
                    setTransactionLedger('');
                    setTransactionAmount('');
                    setTransactionRemark('');
                    setTransactionLedgerSearchQuery('');
                    setTransactionModalOpen(true);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span className="txn-btn-label">Add Transaction</span>
                </button>
              </div>
            </div>

            {/* Premium Table Card */}
            <div className="master-grid-card desktop-only">
              <div className="master-table-wrapper">
                <table className="master-format-table">
                  <thead>
                    <tr>
                      <th style={{ width: '4%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '12%' }}>Date</th>
                      <th style={{ width: '16%' }}>Voucher Type</th>
                      <th style={{ width: '30%', textAlign: 'left' }}>Particulars (Ledger Name)</th>
                      <th style={{ width: '26%', textAlign: 'left' }}>Narration (Remark)</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingTransactions ? (
                      <tr>
                        <td colSpan="6" className="no-master-results" style={{ padding: '40px 0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth="3">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" />
                              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                            </svg>
                            <span>Fetching live accounting entries from Tally Prime...</span>
                          </div>
                        </td>
                      </tr>
                    ) : transactionError ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#C53030', fontSize: '13px', background: '#FFF5F5' }}>
                          ⚠ {transactionError}
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="no-master-results">
                          No receipts or payments found. Click the sync button to load from Tally.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx, idx) => (
                        <tr key={tx.id || idx}>
                          <td className="text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="font-medium text-slate-600">{tx.date}</td>
                          <td>
                            <span 
                              className={`profile-role-badge`} 
                              style={{ 
                                backgroundColor: tx.type.toLowerCase() === 'receipt' ? 'rgba(72, 187, 120, 0.15)' : 'rgba(245, 101, 101, 0.15)',
                                color: tx.type.toLowerCase() === 'receipt' ? '#38A169' : '#E53E3E',
                                border: `1px solid ${tx.type.toLowerCase() === 'receipt' ? 'rgba(72, 187, 120, 0.25)' : 'rgba(245, 101, 101, 0.25)'}`,
                                fontWeight: 'bold'
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="font-bold text-slate-800" style={{ textAlign: 'left' }}>{tx.ledgerName}</td>
                          <td className="italic text-slate-500 font-medium" style={{ textAlign: 'left', fontSize: '12.5px' }}>{tx.remark || '—'}</td>
                          <td className="font-extrabold text-slate-800" style={{ textAlign: 'right', color: tx.type.toLowerCase() === 'receipt' ? '#2F855A' : '#C53030' }}>
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile transaction cards */}
            <div className="txn-mobile-cards">
              {isLoadingTransactions ? (
                <div className="cashbook-mobile-empty">Fetching transactions from Tally...</div>
              ) : transactionError ? (
                <div className="cashbook-mobile-empty" style={{ color: '#C53030' }}>⚠ {transactionError}</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="cashbook-mobile-empty">No transactions found. Sync to load from Tally.</div>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const isReceipt = tx.type.toLowerCase() === 'receipt';
                  return (
                    <div key={tx.id || idx} className="txn-mobile-card">
                      <div className="txn-card-left">
                        <div className="txn-card-name-row">
                          <span className="txn-card-name">{tx.ledgerName}</span>
                          <span className="txn-card-badge" style={{ backgroundColor: isReceipt ? 'rgba(72,187,120,0.15)' : 'rgba(245,101,101,0.15)', color: isReceipt ? '#38A169' : '#E53E3E' }}>{tx.type}</span>
                        </div>
                        <span className="txn-card-date">{tx.date}</span>
                      </div>
                      <div className="txn-card-right">
                        <span className="txn-card-amount" style={{ color: isReceipt ? '#2F855A' : '#C53030' }}>{formatCurrency(tx.amount)}</span>
                        {tx.remark && <span className="txn-card-remark">{tx.remark}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Gorgeous overlay modal for adding Tally Transaction */}
            {transactionModalOpen && (
              <div className="modal-backdrop-overlay">
                <div className="modal-content-card customer-modal">
                  <div className="modal-header-row">
                    <h3>New Tally Transaction</h3>
                    <button className="modal-close-btn" onClick={() => setTransactionModalOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleTransactionSubmit} className="modal-ledger-form" style={{ paddingBottom: '16px' }}>
                    <div className="modal-scroll-body" style={{ paddingBottom: '10px' }}>
                      {/* 1. Receipt / Payment Segmented Toggle */}
                      <div className="modal-form-field">
                        <label>Voucher Type</label>
                        <div className="transaction-type-toggle" style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className={`type-toggle-btn receipt ${transactionType === 'Receipt' ? 'active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => setTransactionType('Receipt')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Receipt (CR)
                          </button>
                          <button
                            type="button"
                            className={`type-toggle-btn payment ${transactionType === 'Payment' ? 'active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => setTransactionType('Payment')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Payment (DR)
                          </button>
                        </div>
                      </div>

                      {/* 2. Searchable Ledger Selector */}
                      <div className="modal-form-field" style={{ position: 'relative' }}>
                        <label>Ledger Name *</label>
                        <div className="transaction-ledger-select" style={{ marginTop: '4px' }}>
                          <div className="transaction-input-wrapper">
                            <span className="transaction-input-icon">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                              </svg>
                            </span>
                            <input
                              type="text"
                              className="has-icon form-text-input"
                              style={{ width: '100%', paddingLeft: '38px' }}
                              placeholder="Search & select ledger..."
                              value={transactionLedgerSearchQuery}
                              onChange={(e) => {
                                setTransactionLedgerSearchQuery(e.target.value);
                                setTransactionLedgerDropdownOpen(true);
                                if (transactionLedger) setTransactionLedger('');
                              }}
                              onFocus={() => setTransactionLedgerDropdownOpen(true)}
                              required
                            />
                          </div>
                          {transactionLedgerDropdownOpen && (
                            <div className="transaction-ledger-dropdown" style={{ left: 0, right: 0, width: '100%', maxHeight: '180px', overflowY: 'auto' }}>
                              {ledgersList
                                .filter(l => l.name.toLowerCase().includes(transactionLedgerSearchQuery.toLowerCase()))
                                .map((ledger) => (
                                  <div
                                    key={ledger.id}
                                    className={`transaction-ledger-option ${transactionLedger === ledger.name ? 'active' : ''}`}
                                    onClick={() => {
                                      setTransactionLedger(ledger.name);
                                      setTransactionLedgerSearchQuery(ledger.name);
                                      setTransactionLedgerDropdownOpen(false);
                                    }}
                                  >
                                    <span>{ledger.name}</span>
                                    <span className="transaction-ledger-group">{ledger.group}</span>
                                  </div>
                                ))}
                              {ledgersList.filter(l => l.name.toLowerCase().includes(transactionLedgerSearchQuery.toLowerCase())).length === 0 && (
                                <div style={{ padding: '12px 16px', fontSize: '12.5px', color: '#8E9BAE', textAlign: 'center' }}>
                                  No matching synced Tally ledgers found.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Amount Field */}
                      <div className="modal-form-field">
                        <label>Amount (₹) *</label>
                        <div className="transaction-input-wrapper" style={{ marginTop: '4px' }}>
                          <span className="transaction-input-icon">₹</span>
                          <input
                            type="number"
                            className="has-icon form-text-input"
                            style={{ width: '100%', paddingLeft: '38px' }}
                            step="any"
                            placeholder="0.00"
                            value={transactionAmount}
                            onChange={(e) => setTransactionAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* 4. Remarks (Narration) */}
                      <div className="modal-form-field">
                        <label>Remark (Narration)</label>
                        <div className="transaction-input-wrapper" style={{ marginTop: '4px' }}>
                          <textarea
                            className="form-text-input"
                            style={{ width: '100%' }}
                            placeholder="Provide narration details for Tally..."
                            value={transactionRemark}
                            onChange={(e) => setTransactionRemark(e.target.value)}
                            rows="3"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="modal-footer-actions">
                      <button
                        type="button"
                        className="modal-btn cancel-btn"
                        onClick={() => setTransactionModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="modal-btn submit-btn animate-button"
                        disabled={isSubmittingTransaction}
                      >
                        {isSubmittingTransaction ? (
                          <>
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '8px' }}>
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                            </svg>
                            Posting...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Post to Tally
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Credit Sales */}
        {activeTab === 'credit-sales' && (
          <div className="ledger-master-view">
            <div className="master-toolbar-row">
              <div className="master-search-bar-full">
                <svg className="flex-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search by voucher no. or party..."
                  value={creditSalesSearch}
                  onChange={e => setCreditSalesSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="master-sync-btn" title="Refresh" onClick={loadCreditSales} disabled={isLoadingCreditSales}>
                  <svg className={isLoadingCreditSales ? 'animate-spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                </button>
                <button className="add-transaction-trigger-btn animate-button" onClick={() => {
                  setCreditSaleModalMode('create');
                  setEditingCreditSaleId(null);
                  setCsVoucherNo(''); setCsDate(''); setCsParty(''); setCsAmount('');
                  setCsFormError('');
                  setCreditSaleModalOpen(true);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span className="txn-btn-label">Add Credit Sale</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="master-grid-card desktop-only">
              <div className="master-table-wrapper">
                <table className="master-format-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '14%' }}>Voucher No.</th>
                      <th style={{ width: '12%' }}>Date</th>
                      <th style={{ width: '28%' }}>Party</th>
                      <th style={{ width: '13%', textAlign: 'right' }}>Amount (₹)</th>
                      <th style={{ width: '13%', textAlign: 'right' }}>Paid (₹)</th>
                      <th style={{ width: '13%', textAlign: 'right' }}>Balance (₹)</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingCreditSales ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0' }}>Loading...</td></tr>
                    ) : creditSales.filter(s =>
                        s.voucher_no?.toLowerCase().includes(creditSalesSearch.toLowerCase()) ||
                        s.party?.toLowerCase().includes(creditSalesSearch.toLowerCase())
                      ).length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0' }}>No credit sales found.</td></tr>
                    ) : creditSales.filter(s =>
                        s.voucher_no?.toLowerCase().includes(creditSalesSearch.toLowerCase()) ||
                        s.party?.toLowerCase().includes(creditSalesSearch.toLowerCase())
                      ).map((sale, idx) => (
                      <tr key={sale.id} style={{ cursor: 'pointer' }}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{sale.voucher_no}</td>
                        <td>{sale.date ? sale.date.split('T')[0] : ''}</td>
                        <td>{sale.party}</td>
                        <td style={{ textAlign: 'right' }}>₹{parseFloat(sale.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', color: '#38A169' }}>₹{parseFloat(sale.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'right', color: parseFloat(sale.balance) > 0 ? '#E53E3E' : '#38A169', fontWeight: 600 }}>₹{parseFloat(sale.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button title="Add / View Payments" className="master-edit-btn" onClick={() => {
                              setSelectedCreditSale(sale);
                              setPaymentDate(''); setPaymentAmount(''); setPaymentVchType(''); setPaymentRemark(''); setPaymentError('');
                              loadSalePayments(sale.id);
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                                <line x1="2" y1="10" x2="22" y2="10"></line>
                              </svg>
                            </button>
                            <button title="Edit" className="master-edit-btn" onClick={() => {
                              setCreditSaleModalMode('edit');
                              setEditingCreditSaleId(sale.id);
                              setCsVoucherNo(sale.voucher_no);
                              setCsDate(sale.date ? sale.date.split('T')[0] : '');
                              setCsParty(sale.party);
                              setCsAmount(String(sale.amount));
                              setCsFormError('');
                              setCreditSaleModalOpen(true);
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button title="Delete" className="master-delete-btn" onClick={async () => {
                              if (!window.confirm(`Delete credit sale "${sale.voucher_no}"?`)) return;
                              await fetch(`${API_BASE}/credit-sales/${sale.id}`, { method: 'DELETE' });
                              loadCreditSales();
                              if (selectedCreditSale?.id === sale.id) setSelectedCreditSale(null);
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="M10 11v6"></path><path d="M14 11v6"></path>
                                <path d="M9 6V4h6v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="mobile-only" style={{ padding: '0 12px 80px' }}>
              {creditSales.filter(s =>
                s.voucher_no?.toLowerCase().includes(creditSalesSearch.toLowerCase()) ||
                s.party?.toLowerCase().includes(creditSalesSearch.toLowerCase())
              ).map(sale => (
                <div key={sale.id} className="mobile-ledger-card" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{sale.party}</div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>#{sale.voucher_no} &bull; {sale.date ? sale.date.split('T')[0] : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>₹{parseFloat(sale.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '12px', color: parseFloat(sale.balance) > 0 ? '#E53E3E' : '#38A169' }}>
                        Bal: ₹{parseFloat(sale.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="master-edit-btn" style={{ flex: 1 }} onClick={() => {
                      setSelectedCreditSale(sale);
                      setPaymentDate(''); setPaymentAmount(''); setPaymentRemark(''); setPaymentError('');
                      loadSalePayments(sale.id);
                    }}>Payments</button>
                    <button className="master-edit-btn" onClick={() => {
                      setCreditSaleModalMode('edit'); setEditingCreditSaleId(sale.id);
                      setCsVoucherNo(sale.voucher_no); setCsDate(sale.date ? sale.date.split('T')[0] : '');
                      setCsParty(sale.party); setCsAmount(String(sale.amount)); setCsFormError('');
                      setCreditSaleModalOpen(true);
                    }}>Edit</button>
                    <button className="master-delete-btn" onClick={async () => {
                      if (!window.confirm(`Delete "${sale.voucher_no}"?`)) return;
                      await fetch(`${API_BASE}/credit-sales/${sale.id}`, { method: 'DELETE' });
                      loadCreditSales();
                      if (selectedCreditSale?.id === sale.id) setSelectedCreditSale(null);
                    }}>Del</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payments panel */}
            {selectedCreditSale && (
              <div className="modal-backdrop-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0 }} onClick={e => { if (e.target === e.currentTarget) setSelectedCreditSale(null); }}>
                <div className="modal-content-card" style={{ maxWidth: '560px', width: '95%', maxHeight: '90vh' }}>
                  <div className="modal-header-row">
                    <h3>Payments — {selectedCreditSale.party}</h3>
                    <button className="modal-close-btn" onClick={() => setSelectedCreditSale(null)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div className="modal-scroll-body" style={{ padding: '14px 20px', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', fontSize: '13px', background: '#F7FAFC', borderRadius: '8px', padding: '10px 14px' }}>
                      <span>Voucher: <strong>{selectedCreditSale.voucher_no}</strong></span>
                      <span>Total: <strong>₹{parseFloat(selectedCreditSale.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                      <span style={{ color: parseFloat(selectedCreditSale.balance) > 0 ? '#E53E3E' : '#38A169' }}>
                        Balance: <strong>₹{parseFloat(selectedCreditSale.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>

                    {/* Add payment form */}
                    <div style={{ background: '#EBF8FF', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px', color: '#2B6CB0' }}>Add Payment</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label className="form-label">Date</label>
                          <input type="date" className="form-input" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Amount (₹)</label>
                          <input type="number" className="form-input" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} min="0" step="0.01" />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label className="form-label">Mode of Payment</label>
                          <input type="text" className="form-input" placeholder="e.g. Cash, UPI, Cheque" value={paymentVchType} onChange={e => setPaymentVchType(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Remark (optional)</label>
                          <input type="text" className="form-input" placeholder="e.g. Cheque no. 123" value={paymentRemark} onChange={e => setPaymentRemark(e.target.value)} />
                        </div>
                      </div>
                      {paymentError && <div style={{ color: '#E53E3E', fontSize: '12px', marginBottom: '6px' }}>{paymentError}</div>}
                      <button
                        className="modal-btn"
                        style={{ width: '100%', background: '#F9575C', color: '#fff' }}
                        disabled={paymentSubmitting}
                        onClick={async () => {
                          if (!paymentDate || !paymentAmount) { setPaymentError('Date and amount are required.'); return; }
                          setPaymentSubmitting(true); setPaymentError('');
                          try {
                            const res = await fetch(`${API_BASE}/credit-sales/${selectedCreditSale.id}/payments`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ payment_date: paymentDate, paid_amount: paymentAmount, vch_type: paymentVchType, remark: paymentRemark })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setPaymentDate(''); setPaymentAmount(''); setPaymentVchType(''); setPaymentRemark('');
                              await loadSalePayments(selectedCreditSale.id);
                              await loadCreditSales();
                              // refresh balance in panel
                              const updated = await fetch(`${API_BASE}/credit-sales`).then(r => r.json());
                              if (updated.success) {
                                setCreditSales(updated.data || []);
                                const fresh = (updated.data || []).find(s => s.id === selectedCreditSale.id);
                                if (fresh) setSelectedCreditSale(fresh);
                              }
                            } else {
                              setPaymentError(data.message || 'Failed to add payment.');
                            }
                          } catch (e) {
                            setPaymentError('Network error.');
                          } finally {
                            setPaymentSubmitting(false);
                          }
                        }}
                      >{paymentSubmitting ? 'Saving...' : 'Add Payment'}</button>
                    </div>

                    {/* Payments list */}
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#4A5568' }}>Payment History</div>
                    {isLoadingPayments ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#A0AEC0', fontSize: '13px' }}>Loading...</div>
                    ) : salePayments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#A0AEC0', fontSize: '13px' }}>No payments recorded yet.</div>
                    ) : (
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#EDF2F7', borderRadius: '6px' }}>
                            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>Amount (₹)</th>
                            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600 }}>Mode</th>
                            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600 }}>Remark</th>
                            <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600 }}>Del</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salePayments.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                              <td style={{ padding: '7px 10px' }}>{p.payment_date ? String(p.payment_date).split('T')[0] : ''}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', color: '#38A169', fontWeight: 600 }}>₹{parseFloat(p.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '7px 10px', color: '#2B6CB0', fontWeight: 500 }}>{p.vch_type || '—'}</td>
                              <td style={{ padding: '7px 10px', color: '#718096' }}>{p.remark || '—'}</td>
                              <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                <button className="master-delete-btn" onClick={async () => {
                                  if (!window.confirm('Delete this payment?')) return;
                                  await fetch(`${API_BASE}/credit-sales/${selectedCreditSale.id}/payments/${p.id}`, { method: 'DELETE' });
                                  await loadSalePayments(selectedCreditSale.id);
                                  const updated = await fetch(`${API_BASE}/credit-sales`).then(r => r.json());
                                  if (updated.success) {
                                    setCreditSales(updated.data || []);
                                    const fresh = (updated.data || []).find(s => s.id === selectedCreditSale.id);
                                    if (fresh) setSelectedCreditSale(fresh);
                                  }
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add / Edit Credit Sale Modal */}
            {creditSaleModalOpen && (
              <div className="modal-backdrop-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0 }} onClick={e => { if (e.target === e.currentTarget) setCreditSaleModalOpen(false); }}>
                <div className="modal-content-card" style={{ maxWidth: '420px', width: '95%', maxHeight: 'unset' }}>
                  <div className="modal-header-row">
                    <h3>{creditSaleModalMode === 'create' ? 'Add Credit Sale' : 'Edit Credit Sale'}</h3>
                    <button className="modal-close-btn" onClick={() => setCreditSaleModalOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Voucher No. <span style={{ color: '#E53E3E' }}>*</span></label>
                        <input type="text" className="form-input" placeholder="e.g. CS-001" value={csVoucherNo} onChange={e => setCsVoucherNo(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Date <span style={{ color: '#E53E3E' }}>*</span></label>
                        <input type="date" className="form-input" value={csDate} onChange={e => setCsDate(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Party <span style={{ color: '#E53E3E' }}>*</span></label>
                      <input type="text" className="form-input" placeholder="Party / Customer name" value={csParty} onChange={e => setCsParty(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Amount (₹) <span style={{ color: '#E53E3E' }}>*</span></label>
                      <input type="number" className="form-input" placeholder="0.00" value={csAmount} onChange={e => setCsAmount(e.target.value)} min="0" step="0.01" />
                    </div>
                    {csFormError && <div style={{ color: '#E53E3E', fontSize: '12px' }}>{csFormError}</div>}
                  </div>
                  <div className="modal-footer-actions" style={{ padding: '0 20px 16px' }}>
                    <button className="modal-btn" style={{ background: '#F1F5F9', color: '#4A5568' }} onClick={() => setCreditSaleModalOpen(false)}>Cancel</button>
                    <button className="modal-btn" style={{ background: '#F9575C', color: '#fff' }} disabled={csSubmitting} onClick={async () => {
                      if (!csVoucherNo || !csDate || !csParty || !csAmount) { setCsFormError('All fields are required.'); return; }
                      setCsSubmitting(true); setCsFormError('');
                      try {
                        const url = creditSaleModalMode === 'create'
                          ? `${API_BASE}/credit-sales`
                          : `${API_BASE}/credit-sales/${editingCreditSaleId}`;
                        const method = creditSaleModalMode === 'create' ? 'POST' : 'PUT';
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ voucher_no: csVoucherNo, date: csDate, party: csParty, amount: csAmount })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setCreditSaleModalOpen(false);
                          loadCreditSales();
                        } else {
                          setCsFormError(data.message || 'Failed to save.');
                        }
                      } catch (e) {
                        setCsFormError('Network error.');
                      } finally {
                        setCsSubmitting(false);
                      }
                    }}>{csSubmitting ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: MD Sales */}
        {activeTab === 'md-sales' && (
          <div className="ledger-master-view">
            <div className="master-toolbar-row">
              <div className="master-search-bar-full">
                <svg className="flex-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0AEC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" placeholder="Search by party or voucher type..." value={mdSalesSearch} onChange={e => setMdSalesSearch(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="master-sync-btn" title="Refresh" onClick={loadMdSales} disabled={isLoadingMdSales}>
                  <svg className={isLoadingMdSales ? 'animate-spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                </button>
                <button className="add-transaction-trigger-btn animate-button" onClick={() => {
                  setMdModalMode('create'); setEditingMdId(null);
                  setMdDate(''); setMdVchType(''); setMdParty(''); setMdAmount(''); setMdFormError('');
                  setMdModalOpen(true);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span className="txn-btn-label">Add MD Sale</span>
                </button>
              </div>
            </div>

            {/* Desktop table */}
            <div className="master-grid-card desktop-only">
              <div className="master-table-wrapper">
                <table className="master-format-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                      <th style={{ width: '12%' }}>Date</th>
                      <th style={{ width: '15%' }}>Vch Type</th>
                      <th style={{ width: '45%' }}>Party</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Amount (₹)</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingMdSales ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0' }}>Loading...</td></tr>
                    ) : mdSales.filter(s =>
                        s.party?.toLowerCase().includes(mdSalesSearch.toLowerCase()) ||
                        (s.vch_type || '').toLowerCase().includes(mdSalesSearch.toLowerCase())
                      ).length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0' }}>No MD sales found.</td></tr>
                    ) : mdSales.filter(s =>
                        s.party?.toLowerCase().includes(mdSalesSearch.toLowerCase()) ||
                        (s.vch_type || '').toLowerCase().includes(mdSalesSearch.toLowerCase())
                      ).map((sale, idx) => (
                      <tr key={sale.id}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{sale.date ? sale.date.split('T')[0] : '—'}</td>
                        <td>{sale.vch_type || '—'}</td>
                        <td>{sale.party}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(sale.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button title="Edit" className="master-edit-btn" onClick={() => {
                              setMdModalMode('edit'); setEditingMdId(sale.id);
                              setMdDate(sale.date ? sale.date.split('T')[0] : '');
                              setMdVchType(sale.vch_type || '');
                              setMdParty(sale.party); setMdAmount(String(sale.amount)); setMdFormError('');
                              setMdModalOpen(true);
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button title="Delete" className="master-delete-btn" onClick={async () => {
                              if (!window.confirm(`Delete this MD sale?`)) return;
                              await fetch(`${API_BASE}/md-sales/${sale.id}`, { method: 'DELETE' });
                              loadMdSales();
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="mobile-only" style={{ padding: '0 12px 80px' }}>
              {mdSales.filter(s =>
                s.party?.toLowerCase().includes(mdSalesSearch.toLowerCase()) ||
                (s.vch_type || '').toLowerCase().includes(mdSalesSearch.toLowerCase())
              ).map(sale => (
                <div key={sale.id} className="mobile-ledger-card" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{sale.party}</div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>{sale.vch_type || '—'} &bull; {sale.date ? sale.date.split('T')[0] : '—'}</div>
                    </div>
                    <div style={{ fontWeight: 600 }}>₹{parseFloat(sale.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="master-edit-btn" onClick={() => {
                      setMdModalMode('edit'); setEditingMdId(sale.id);
                      setMdDate(sale.date ? sale.date.split('T')[0] : ''); setMdVchType(sale.vch_type || '');
                      setMdParty(sale.party); setMdAmount(String(sale.amount)); setMdFormError('');
                      setMdModalOpen(true);
                    }}>Edit</button>
                    <button className="master-delete-btn" onClick={async () => {
                      if (!window.confirm(`Delete this MD sale?`)) return;
                      await fetch(`${API_BASE}/md-sales/${sale.id}`, { method: 'DELETE' });
                      loadMdSales();
                    }}>Del</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Edit MD Sale Modal */}
            {mdModalOpen && (
              <div className="modal-backdrop-overlay" style={{ zIndex: 9999, position: 'fixed', inset: 0 }} onClick={e => { if (e.target === e.currentTarget) setMdModalOpen(false); }}>
                <div className="modal-content-card" style={{ maxWidth: '420px', width: '95%', maxHeight: 'unset' }}>
                  <div className="modal-header-row">
                    <h3>{mdModalMode === 'create' ? 'Add MD Sale' : 'Edit MD Sale'}</h3>
                    <button className="modal-close-btn" onClick={() => setMdModalOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Date <span style={{ color: '#718096', fontSize: '11px' }}>(optional)</span></label>
                        <input type="date" className="form-input" value={mdDate} onChange={e => setMdDate(e.target.value)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Vch Type <span style={{ color: '#718096', fontSize: '11px' }}>(optional)</span></label>
                        <input type="text" className="form-input" placeholder="e.g. Sales, Receipt" value={mdVchType} onChange={e => setMdVchType(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Party <span style={{ color: '#E53E3E' }}>*</span></label>
                      <input type="text" className="form-input" placeholder="Party / Customer name" value={mdParty} onChange={e => setMdParty(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Amount (₹) <span style={{ color: '#E53E3E' }}>*</span></label>
                      <input type="number" className="form-input" placeholder="0.00" value={mdAmount} onChange={e => setMdAmount(e.target.value)} min="0" step="0.01" />
                    </div>
                    {mdFormError && <div style={{ color: '#E53E3E', fontSize: '12px' }}>{mdFormError}</div>}
                  </div>
                  <div className="modal-footer-actions" style={{ padding: '0 20px 16px' }}>
                    <button className="modal-btn" style={{ background: '#F1F5F9', color: '#4A5568' }} onClick={() => setMdModalOpen(false)}>Cancel</button>
                    <button className="modal-btn" style={{ background: '#F9575C', color: '#fff' }} disabled={mdSubmitting} onClick={async () => {
                      if (!mdParty || !mdAmount) { setMdFormError('Party and Amount are required.'); return; }
                      setMdSubmitting(true); setMdFormError('');
                      try {
                        const url = mdModalMode === 'create' ? `${API_BASE}/md-sales` : `${API_BASE}/md-sales/${editingMdId}`;
                        const method = mdModalMode === 'create' ? 'POST' : 'PUT';
                        const res = await fetch(url, {
                          method, headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ date: mdDate || null, vch_type: mdVchType || null, party: mdParty, amount: mdAmount })
                        });
                        const data = await res.json();
                        if (data.success) { setMdModalOpen(false); loadMdSales(); }
                        else { setMdFormError(data.message || 'Failed to save.'); }
                      } catch (e) { setMdFormError('Network error.'); }
                      finally { setMdSubmitting(false); }
                    }}>{mdSubmitting ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar — same order as web top nav */}
      <nav className="bottom-nav">
        {/* 1. Home */}
        <button className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Home</span>
        </button>

        {/* 2. Master */}
        <button className={`bottom-nav-item ${activeTab === 'ledger-master' ? 'active' : ''}`} onClick={() => setActiveTab('ledger-master')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
          </svg>
          <span>Master</span>
        </button>

        {/* 3. Ledger */}
        <button
          className={`bottom-nav-item ${activeTab === 'ledger-voucher' || activeTab === 'ledger-outstanding' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger-voucher')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>Ledger</span>
        </button>

        {/* 4. Cash Book */}
        <button className={`bottom-nav-item ${activeTab === 'cash-book' ? 'active' : ''}`} onClick={() => setActiveTab('cash-book')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>Cash Book</span>
        </button>

        {/* 5. Outstanding */}
        <button className={`bottom-nav-item ${activeTab === 'outstanding' ? 'active' : ''}`} onClick={() => setActiveTab('outstanding')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Outstanding</span>
        </button>

        {/* 6. Transaction */}
        <button className={`bottom-nav-item ${activeTab === 'transaction' ? 'active' : ''}`} onClick={() => setActiveTab('transaction')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          <span>Txn</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
