const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir ficheiros estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const employeesRoutes = require('./routes/employees.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const recruitmentRoutes = require('./routes/recruitment.routes');
const payrollRoutes = require('./routes/payroll.routes');
const performanceRoutes = require('./routes/performance.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const reportsRoutes = require('./routes/reports.routes');
const requisitionsRoutes = require('./routes/requisitions.routes');
const mobilityRoutes = require('./routes/mobility.routes');
const offboardingRoutes = require('./routes/offboarding.routes');
const rsDashboardRoutes = require('./routes/rs-dashboard.routes');
const auditRoutes = require('./routes/audit.routes');
const talentPoolRoutes = require('./routes/talent-pool.routes');
const evaluationsRoutes = require('./routes/evaluations.routes');

// Usar rotas
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

// Rota de teste
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Sistema de RH COPIA GROUP está a funcionar',
        timestamp: new Date().toISOString()
    });
});

// Rota catch-all para servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Sistema de RH - COPIA GROUP OF COMPANIES S.A.        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n✓ Servidor a correr em http://localhost:${PORT}`);
    console.log('✓ Backend pronto');
    console.log('✓ Frontend disponível\n');
    console.log('Credenciais padrão:');
    console.log('  - Username: admin');
    console.log('  - Password: admin123\n');
});

module.exports = app;
