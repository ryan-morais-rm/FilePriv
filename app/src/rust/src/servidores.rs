use crate::proto::filepriv::ServidorCandidato;

pub fn escolher_servidor_menos_carregado(
    candidatos: &[ServidorCandidato],
) -> Option<&ServidorCandidato> {
    candidatos.iter().min_by_key(|s| s.arquivos_armazenados)
}