// O struct que gerencia as VMs 

use std::path::PathBuf;
use crate::machines::nodestorage::StorageNode;

pub struct ShardManager {
    pub nodes: Vec<StorageNode>,
    pub watch_dir: PathBuf,
}

impl ShardManager {
    pub fn register_node(&mut self, node: StorageNode) {
    }

    pub async fn process_and_distribute(&self, file_path: PathBuf) -> MyResult<()> {
        Ok(())
    }
}