export const CATEGORIAS_USUARIO = [
    'ESTUDANTE',
    'CONCURSEIRO',
    'ADVOGADO',
    'CONTADOR',
    'DESENVOLVEDOR',
    'SAUDE',
    'DESIGNER',
    'EMPRESARIO',
    'SERVIDOR_PUBLICO',
    'OUTROS'
];

// Categorias de arquivo sugeridas por perfil, apenas em nível de rótulo/organização,
export const CATEGORIAS_ARQUIVO_POR_PERFIL = {
    ESTUDANTE: ['Provas', 'Trabalhos', 'Apostilas', 'Certificados'],
    CONCURSEIRO: ['Editais', 'Simulados', 'Material de Estudo', 'Cronogramas'],
    ADVOGADO: ['Processos', 'Contratos', 'Petições', 'Pareceres'],
    CONTADOR: ['Notas Fiscais', 'Balanços', 'Declarações', 'Contratos'],
    DESENVOLVEDOR: ['Documentação Técnica', 'Backups de Projeto', 'Certificados', 'Contratos'],
    SAUDE: ['Prontuários', 'Exames', 'Laudos', 'Certificados'],
    DESIGNER: ['Portfólio', 'Briefings', 'Contratos', 'Referências'],
    EMPRESARIO: ['Contratos', 'Notas Fiscais', 'Propostas', 'Certidões'],
    SERVIDOR_PUBLICO: ['Ofícios', 'Processos Administrativos', 'Editais', 'Certidões'],
    OUTROS: ['Documentos Pessoais', 'Fotos', 'Certificados', 'Diversos']
};

// Sempre disponível, independente do perfil — válvula de escape.
export const CATEGORIA_ARQUIVO_CORINGA = 'Outros';

// Reservada pra uso futuro (T4 — troca de perfil). Não é oferecida como
// opção no upload normal.
export const CATEGORIA_ARQUIVO_MIGRACAO = 'Migração';

export function categoriasArquivoValidasParaPerfil(categoriaPerfil) {
    const especificas = CATEGORIAS_ARQUIVO_POR_PERFIL[categoriaPerfil] || [];
    return [...new Set([...especificas, CATEGORIA_ARQUIVO_CORINGA])];
}