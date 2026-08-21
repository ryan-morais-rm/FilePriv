// O loop que vigia a pasta /uploads

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::sleep;

// Função pública que inicia o monitoramento
// Ela recebe um 'tx' (Transmissor) para avisar a Main thread quando um arquivo estiver REALMENTE pronto.
pub async fn watch_directory(path_str: String, tx: mpsc::Sender<PathBuf>) -> Result<(), String> {
    let path = Path::new(&path_str);

    if !path.exists() {
        return Err(format!("O diretório '{}' não existe.", path_str));
    }

    println!("Monitorando diretório: {}", path_str);

    // Configuração do canal interno para comunicar entre a thread do watcher (bloqueante) e o async do Tokio
    let (internal_tx, mut internal_rx) = mpsc::channel::<PathBuf>(100);

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    if let EventKind::Create(_) | EventKind::Modify(_) = event.kind {
                        for path in event.paths {
                            let _ = internal_tx.blocking_send(path);
                        }
                    }
                },
                Err(e) => println!("Erro de monitoramento: {:?}", e),
            }
        },
        Config::default(),
    ).map_err(|e| e.to_string())?;

    watcher.watch(path, RecursiveMode::Recursive).map_err(|e| e.to_string())?;

    while let Some(file_path) = internal_rx.recv().await {
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            if let Ok(ready_path) = wait_until_file_is_stable(&file_path).await {
                let _ = tx_clone.send(ready_path).await;
            }
        });
    }

    Ok(())
}

async fn wait_until_file_is_stable(path: &PathBuf) -> Result<PathBuf, String> {
    let check_interval = Duration::from_secs(2); 
    let max_retries = 30; 
    let mut last_size = 0;
    sleep(Duration::from_millis(500)).await;

    for i in 0..max_retries {
        match tokio::fs::metadata(path).await {
            Ok(metadata) => {
                let current_size = metadata.len();

                if current_size > 0 && current_size == last_size {
                    println!("Arquivo estabilizado: {:?} ({} bytes)", path.file_name().unwrap(), current_size);
                    return Ok(path.clone());
                }

                if current_size != last_size {
                    println!("Arquivo crescendo... ({} bytes)", current_size); // Opcional: Debug
                    last_size = current_size;
                }
            }
            Err(_) => {
                return Err("Arquivo inacessível ou deletado".to_string());
            }
        }
        sleep(check_interval).await;
    }
    Err(format!("Timeout: O arquivo {:?} nunca estabilizou.", path))
}