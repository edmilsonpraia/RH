const express = require('express');
const cors = require('cors');
const { dbReady } = require('../backend/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Sistema de RH COPIA GROUP - Vercel',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
