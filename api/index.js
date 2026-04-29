const express = require('express');
const cors = require('cors');
const { dbReady } = require('../backend/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Esperar BD estar pronta antes de processar qualquer request
app.use(async (req, res, next) => {
    await dbReady;
    next();
});

// Importar rotas
const authRoutes = require('../backend/routes/auth.routes');
const usersRoutes = require('../backend/routes/users.routes');
const employeesRoutes = require('../backend/routes/employees.routes');
const attendanceRoutes = require('../backend/routes/attendance.routes');
const recruitmentRoutes = require('../backend/routes/recruitment.routes');
const payrollRoutes = require('../backend/routes/payroll.routes');
const performanceRoutes = require('../backend/routes/performance.routes');
const onboardingRoutes = require('../backend/routes/onboarding.routes');
const reportsRoutes = require('../backend/routes/reports.routes');
const requisitionsRoutes = require('../backend/routes/requisitions.routes');
const mobilityRoutes = require('../backend/routes/mobility.routes');
const offboardingRoutes = require('../backend/routes/offboarding.routes');
const rsDashboardRoutes = require('../backend/routes/rs-dashboard.routes');
const auditRoutes = require('../backend/routes/audit.routes');
const talentPoolRoutes = require('../backend/routes/talent-pool.routes');
const evaluationsRoutes = require('../backend/routes/evaluations.routes');

// Montar rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/requisitions', requisitionsRoutes);
app.use('/api/mobility', mobilityRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/rs-dashboard', rsDashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/talent-pool', talentPoolRoutes);
app.use('/api/evaluations', evaluationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Sistema de RH COPIA GROUP - Vercel',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
