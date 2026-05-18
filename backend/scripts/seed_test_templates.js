#!/usr/bin/env node
/**
 * Seed dos 2 templates de teste built-in (admin_ch e ti).
 * Idempotente via UPSERT por code.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const adminCh = {
    title: 'Capital Humano — Assistente Administrativo',
    description: 'Questões básicas de Verdadeiro/Falso (20 perguntas)',
    type: 'vf',
    questions: [
        { q: 'O Capital Humano está relacionado com a gestão de pessoas dentro da empresa.', correct: 'V' },
        { q: 'Informações dos colaboradores podem ser partilhadas livremente fora da empresa.', correct: 'F' },
        { q: 'A pontualidade é importante no ambiente profissional.', correct: 'V' },
        { q: 'O processo de recrutamento ajuda a identificar candidatos adequados para uma função.', correct: 'V' },
        { q: 'Um profissional de RH deve tratar todos os colaboradores de forma respeitosa.', correct: 'V' },
        { q: 'Faltas frequentes não impactam o desempenho profissional.', correct: 'F' },
        { q: 'A comunicação profissional é importante no ambiente de trabalho.', correct: 'V' },
        { q: 'Um estagiário não precisa cumprir normas internas da empresa.', correct: 'F' },
        { q: 'Organização de documentos pode fazer parte das actividades do Capital Humano.', correct: 'V' },
        { q: 'O trabalho em equipa é importante na área de Recursos Humanos.', correct: 'V' },
        { q: 'Um colaborador deve esconder erros cometidos no trabalho.', correct: 'F' },
        { q: 'O sigilo profissional é importante na gestão de informações dos colaboradores.', correct: 'V' },
        { q: 'O atendimento aos colaboradores deve ser feito com educação e profissionalismo.', correct: 'V' },
        { q: 'O uso correcto do e-mail profissional faz parte da comunicação corporativa.', correct: 'V' },
        { q: 'O RH existe apenas para contratar funcionários.', correct: 'F' },
        { q: 'Atenção aos detalhes é importante em tarefas administrativas.', correct: 'V' },
        { q: 'Um ambiente de trabalho saudável contribui para melhor desempenho dos colaboradores.', correct: 'V' },
        { q: 'Conflitos no trabalho devem ser ignorados pela equipa de RH.', correct: 'F' },
        { q: 'Aprender novos processos faz parte do crescimento profissional.', correct: 'V' },
        { q: 'Um profissional de Capital Humano deve agir com ética e responsabilidade.', correct: 'V' }
    ]
};

const ti = {
    title: 'Técnico de TI',
    description: 'Questões técnicas de múltipla escolha (20 perguntas)',
    type: 'mc',
    questions: [
        { q: 'Um sistema apresenta lentidão após uma atualização. Qual é a primeira ação recomendada?', options: ['Formatar o servidor imediatamente.', 'Reverter a atualização e monitorar o comportamento.', 'Ignorar, pois é temporário.', 'Desligar o sistema até novo aviso.'], correct: 1 },
        { q: 'Qual protocolo é responsável pela atribuição automática de endereços IP na rede?', options: ['DNS', 'FTP', 'DHCP', 'HTTP'], correct: 2 },
        { q: 'Qual comando SQL é utilizado para recuperar dados de uma tabela?', options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'], correct: 2 },
        { q: 'Um arquivo tem 2 048 KB. Qual é o seu tamanho em MB?', options: ['2 MB', '20 MB', '0,2 MB', '204,8 MB'], correct: 0 },
        { q: 'Um servidor processa 120 requisições por minuto. Quantas requisições processa em 2,5 horas?', options: ['14 400', '18 000', '16 000', '12 000'], correct: 1 },
        { q: 'Qual dispositivo é utilizado para interligar computadores numa rede local?', options: ['Scanner', 'Switch', 'Impressora', 'Projector'], correct: 1 },
        { q: 'O que significa a sigla CPU?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing User'], correct: 1 },
        { q: 'Qual sistema operativo é amplamente utilizado em servidores?', options: ['Linux', 'Paint', 'Excel', 'Chrome'], correct: 0 },
        { q: 'Qual é a principal função de um antivírus?', options: ['Melhorar a internet', 'Proteger o sistema contra ameaças digitais', 'Aumentar a memória RAM', 'Criar backups automáticos'], correct: 1 },
        { q: 'Qual extensão é normalmente utilizada para arquivos do Excel?', options: ['.mp3', '.jpg', '.xlsx', '.html'], correct: 2 },
        { q: 'O que acontece quando um computador não possui memória RAM suficiente?', options: ['O computador funciona mais rápido', 'O sistema pode apresentar lentidão', 'A internet melhora', 'O monitor desliga automaticamente'], correct: 1 },
        { q: 'Qual ferramenta é mais utilizada para testar conectividade de rede?', options: ['Paint', 'Ping', 'Word', 'Photoshop'], correct: 1 },
        { q: 'Qual é a função principal do firewall?', options: ['Melhorar a resolução do monitor', 'Bloquear acessos não autorizados à rede', 'Aumentar a velocidade do teclado', 'Limpar arquivos temporários'], correct: 1 },
        { q: 'Um computador ligado à internet sem proteção adequada pode:', options: ['Ficar imune a vírus', 'Sofrer ataques cibernéticos', 'Melhorar automaticamente o desempenho', 'Aumentar a capacidade do disco'], correct: 1 },
        { q: 'Qual destes equipamentos é considerado dispositivo de entrada?', options: ['Monitor', 'Impressora', 'Teclado', 'Projector'], correct: 2 },
        { q: 'O backup serve para:', options: ['Excluir arquivos antigos', 'Recuperar dados em caso de perda', 'Aumentar a velocidade da internet', 'Melhorar a qualidade do áudio'], correct: 1 },
        { q: 'Qual linguagem é mais utilizada para estruturar páginas web?', options: ['HTML', 'SQL', 'Python', 'Java'], correct: 0 },
        { q: 'Qual é a função do DNS?', options: ['Armazenar arquivos', 'Traduzir nomes de domínio em endereços IP', 'Bloquear vírus', 'Gerar relatórios financeiros'], correct: 1 },
        { q: 'Um técnico de TI deve manter sigilo sobre dados e informações da empresa.', options: ['Verdadeiro', 'Falso'], correct: 0 },
        { q: 'Reiniciar um equipamento pode resolver problemas temporários de sistema.', options: ['Verdadeiro', 'Falso'], correct: 0 }
    ]
};

(async () => {
    for (const [code, tpl] of Object.entries({ admin_ch: adminCh, ti })) {
        const { data, error } = await sb.from('test_templates').upsert({
            code,
            title: tpl.title,
            description: tpl.description,
            type: tpl.type,
            questions: tpl.questions,
            is_active: true,
            is_builtin: true
        }, { onConflict: 'code' }).select();
        if (error) console.error('Erro upsert ' + code + ':', error.message);
        else console.log('OK ' + code + ' (id=' + (data?.[0]?.id) + ')');
    }

    const { data: all } = await sb.from('test_templates').select('id, code, title, type, is_active, is_builtin');
    console.log('\nTemplates na BD:');
    (all || []).forEach(t => console.log('  ' + t.id + '. [' + t.code + '] ' + t.title + ' (' + t.type + (t.is_builtin ? ', builtin' : '') + ')'));
})();
