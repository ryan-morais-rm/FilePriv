export function servers() {
    let chartInstance;

    const nodesData = {
        1: { name: 'NODE-01', ip: '10.0.10.10', port: '30120', cpu: 1, ram: 2, disk: '10 GB SSD', color: '#0d6efd', cssClass: 'text-primary-custom' },
        2: { name: 'NODE-02', ip: '10.0.10.11', port: '30210', cpu: 1, ram: 2, disk: '10 GB SSD', color: 'rgb(234, 179, 8)', cssClass: 'text-yellow-600' },
        3: { name: 'NODE-03', ip: '10.0.10.12', port: '30120', cpu: 1, ram: 2, disk: '10 GB SSD', color: 'rgb(22, 163, 74)', cssClass: 'text-green-600' }
    };

    // Função para renderizar a tabela (Necessária pois o HTML está limpo)
    function renderTable() {
        const tbody = document.getElementById('specsTableBody');
        if (!tbody) return;

        tbody.innerHTML = Object.entries(nodesData).map(([id, node]) => `
            <tr id="row-${id}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${node.cssClass}">${node.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" id="ip-${id}">${node.ip}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" id="port-${id}">${node.port}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" id="cpu-${id}">${node.cpu}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" id="ram-${id}">${node.ram} GB</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" id="disk-${id}">${node.disk}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="toggleEdit(${id})" class="text-primary-custom hover:text-blue-800 font-bold bg-blue-50 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100 transition">Editar</button>
                </td>
            </tr>
        `).join('');
    }

    // Função para alternar edição
    function toggleEdit(id) {
        const row = document.getElementById(`row-${id}`);
        const btn = row.querySelector('button');
        
        // Células
        const ipCell = document.getElementById(`ip-${id}`);
        const portCell = document.getElementById(`port-${id}`);
        const cpuCell = document.getElementById(`cpu-${id}`);
        const ramCell = document.getElementById(`ram-${id}`);
        const diskCell = document.getElementById(`disk-${id}`);

        if (btn.innerText === 'Editar') {
            // Entrar no modo de edição
            const currentIp = ipCell.innerText.trim();
            const currentPort = portCell.innerText.trim();
            const currentCpu = cpuCell.innerText.trim();
            const currentRam = ramCell.innerText.replace(' GB', '').trim();
            const currentDisk = diskCell.innerText.trim();

            ipCell.innerHTML = `<input type="text" id="input-ip-${id}" value="${currentIp}" class="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">`;
            portCell.innerHTML = `<input type="number" id="input-port-${id}" value="${currentPort}" class="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">`;
            cpuCell.innerHTML = `<input type="number" id="input-cpu-${id}" value="${currentCpu}" class="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">`;
            ramCell.innerHTML = `<input type="number" id="input-ram-${id}" value="${currentRam}" class="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">`;
            diskCell.innerHTML = `<input type="text" id="input-disk-${id}" value="${currentDisk}" class="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">`;
            
            btn.innerText = 'Salvar';
            btn.classList.remove('bg-blue-50', 'text-primary-custom');
            btn.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
        } else {
            // Salvar alterações (Frontend)
            const newIp = document.getElementById(`input-ip-${id}`).value;
            const newPort = document.getElementById(`input-port-${id}`).value;
            const newCpu = document.getElementById(`input-cpu-${id}`).value;
            const newRam = document.getElementById(`input-ram-${id}`).value;
            const newDisk = document.getElementById(`input-disk-${id}`).value;

            // Atualiza visualização
            ipCell.innerText = newIp;
            portCell.innerText = newPort;
            cpuCell.innerText = newCpu;
            ramCell.innerText = newRam + ' GB';
            diskCell.innerText = newDisk;

            // Atualiza dados internos
            nodesData[id].cpu = newCpu;
            nodesData[id].ram = newRam;

            // Atualiza Gráfico
            updateChartLabels();

            // Restaura botão
            btn.innerText = 'Editar';
            btn.classList.add('bg-blue-50', 'text-primary-custom');
            btn.classList.remove('bg-green-100', 'text-green-700', 'border-green-300');
        }
    }

    // Expor toggleEdit para o escopo global para que o HTML onclick funcione
    window.toggleEdit = toggleEdit;

    function updateChartLabels() {
        if(chartInstance) {
            chartInstance.data.datasets[0].label = `${nodesData[1].name} (${nodesData[1].cpu}vCPU)`;
            chartInstance.data.datasets[1].label = `${nodesData[2].name} (${nodesData[2].cpu}vCPU)`;
            chartInstance.data.datasets[2].label = `${nodesData[3].name} (${nodesData[3].cpu}vCPU)`;
            chartInstance.update();
        }
    }

    // Renderiza o gráfico
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Renderiza a tabela primeiro
    renderTable();

    const data = {
        labels: ['08:00', '09:00', '10:00', '11:00', '12:00'],
        datasets: [
            {
                label: `${nodesData[1].name} (${nodesData[1].cpu}vCPU)`,
                data: [45, 50, 75, 65, 55],
                borderColor: nodesData[1].color,
                backgroundColor: 'rgba(13, 110, 253, 0.1)', 
                tension: 0.4, borderWidth: 2, pointRadius: 4
            },
            {
                label: `${nodesData[2].name} (${nodesData[2].cpu}vCPU)`,
                data: [20, 25, 30, 22, 18],
                borderColor: nodesData[2].color,
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                tension: 0.4, borderWidth: 2, pointRadius: 4
            },
            {
                label: `${nodesData[3].name} (${nodesData[3].cpu}vCPU)`,
                data: [10, 15, 40, 12, 10],
                borderColor: nodesData[3].color,
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                tension: 0.4, borderWidth: 2, pointRadius: 4
            }
        ]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#1f2937', usePointStyle: true } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, max: 100, title: { display: true, text: 'Carga (%)' } },
                x: { title: { display: true, text: 'Horário' } }
            }
        }
    };

    chartInstance = new Chart(ctx, config);
}