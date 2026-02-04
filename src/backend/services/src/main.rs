mod config;
mod files;
mod machines;
mod watcher;

use crate::config::AppConfig;
use crate::machines::shardmanager::ShardManager;
use crate::machines::node::StorageNode;
use std::fs;
use tokio::sync::mpsc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!(">> FILEPRIV STORAGE SYSTEM <<");
    println!(">> Inicializando serviços...");

    let config = AppConfig::load().expect("Falha crítica ao carregar configurações");

    println!("------------------------------------------------");
    println!("Configuração Carregada:");
    println!("- Watch Folder: {}", config.watch_folder);
    println!("- Chunk Size: {} MB", config.chunk_size / 1024 / 1024);
    println!("- Usuário SSH: {}", config.ssh_user);
    println!("- Nodes definidos: {:?}", config.node_ips);
    println!("------------------------------------------------");

    let mut manager = ShardManager::new(config.chunk_size, &config.master_key);

    for (index, ip) in config.node_ips.iter().enumerate() {
        let mut node = StorageNode::new(
            index as u8,
            ip.clone(),
            22, 
            config.ssh_user.clone(),
            config.ssh_key_path.clone(),
        );

        match node.try_connect() {
            Ok(_) => println!("[OK] Node {} ({}) conectado.", index, ip),
            Err(e) => println!("[AVISO] Node {} ({}) offline: {}", index, ip, e),
        }

        manager.add_node(node);
    }

    let (tx, mut rx) = mpsc::channel(100);

    let folder_path = config.watch_folder.clone();
    tokio::spawn(async move {
        if let Err(e) = watcher::watch_directory(folder_path, tx).await {
            eprintln!("CRITICAL: O Watcher parou de funcionar: {}", e);
        }
    });

    println!(">> Sistema Online. Aguardando arquivos em '{}'...", config.watch_folder);

    while let Some(file_path) = rx.recv().await {
        println!("\n>> Novo arquivo detectado: {:?}", file_path);

        match manager.process_upload(file_path.clone()).await {
            Ok(_) => {
                println!(">> Upload concluído com sucesso!");

                match fs::remove_file(&file_path) {
                    Ok(_) => println!(">> Arquivo original removido de 'uploads'."),
                    Err(e) => eprintln!(">> ERRO ao deletar original: {}", e),
                }
            },
            Err(e) => {
                eprintln!(">> FALHA no processamento de {:?}: {}", file_path, e);
            }
        }
        
        println!(">> Aguardando próximo arquivo...");
    }

    Ok(())
}