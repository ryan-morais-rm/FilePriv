export const LABEL_CATEGORIA_USUARIO = {
    ESTUDANTE: 'Estudante',
    CONCURSEIRO: 'Concurseiro(a)',
    ADVOGADO: 'Advogado(a)',
    CONTADOR: 'Contador(a)',
    DESENVOLVEDOR: 'Desenvolvedor(a) / TI',
    SAUDE: 'Profissional de Saúde',
    DESIGNER: 'Designer / Criativo',
    EMPRESARIO: 'Empresário(a) / Autônomo(a)',
    SERVIDOR_PUBLICO: 'Servidor(a) Público(a)',
    OUTROS: 'Uso Pessoal / Outros'
};

// Versão curta usada no formato "nome/categoria" ao lado do nome do usuário.
export const SLUG_CATEGORIA_USUARIO = {
    ESTUDANTE: 'estudante',
    CONCURSEIRO: 'concurseiro',
    ADVOGADO: 'advogado',
    CONTADOR: 'contador',
    DESENVOLVEDOR: 'desenvolvedor',
    SAUDE: 'saúde',
    DESIGNER: 'designer',
    EMPRESARIO: 'empresário',
    SERVIDOR_PUBLICO: 'servidor público',
    OUTROS: 'outros'
};

export function labelCategoriaUsuario(valor) {
    return LABEL_CATEGORIA_USUARIO[valor] || valor;
}

export function slugCategoriaUsuario(valor) {
    return SLUG_CATEGORIA_USUARIO[valor] || (valor ? valor.toLowerCase() : '');
}

export function popularSelectCategoriasUsuario(selectEl, categorias) {
    if (!selectEl) return;
    categorias.forEach((valor) => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = labelCategoriaUsuario(valor);
        selectEl.appendChild(option);
    });
}