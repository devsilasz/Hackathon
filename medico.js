const cardsContainer = document.getElementById("cardsContainer");

// Função para buscar e exibir os pacientes
async function fetchPacientes() {
    try {
        const response = await fetch("http://localhost:3000/fila");
        const pacientes = await response.json();

        // Limpa o container antes de adicionar novos cards
        cardsContainer.innerHTML = '';

        pacientes.forEach((paciente, index) => {
            const card = document.createElement("div");
            card.classList.add("card");

            // Formatação com numeração, dados e separador para cada paciente
            card.innerHTML = `
                <h3>${index + 1}. Paciente: ${paciente.nome}</h3>
                <p><strong>Doenças ou Intolerâncias Prévias:</strong> ${paciente.doencasIntolerancias || "Não informado"}</p>
                <p><strong>Sintomas:</strong> ${paciente.sintomas || "Aguardando sintomas..."}</p>
                <p><strong>Diagnóstico:</strong><br> ${paciente.diagnostico || "Em análise..."}</p>
                <label>
                    <input type="checkbox" class="checkbox-revisao" data-id="${paciente.id}">
                    Revisado por um profissional
                </label>
                <button class="resolved-button" onclick="removerPaciente(${paciente.id})">Resolvido</button>
                <br><hr style="border-top: 1px dashed #000;">
            `;

            cardsContainer.appendChild(card);
        });

        // Adiciona eventos para os checkboxes
        document.querySelectorAll('.checkbox-revisao').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                const pacienteId = event.target.dataset.id;
                if (event.target.checked) {
                    alert(`Diagnóstico do paciente ${pacienteId} revisado!`);
                }
            });
        });
    } catch (error) {
        console.error("Erro ao carregar pacientes:", error);
    }
}

// Função para remover paciente ao clicar em "Resolvido"
async function removerPaciente(pacienteId) {
    try {
        const response = await fetch(`http://localhost:3000/fila/${pacienteId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            alert("Paciente removido da fila.");
            fetchPacientes();  // Atualiza a lista de pacientes
        } else {
            alert("Erro ao remover paciente.");
        }
    } catch (error) {
        console.error("Erro ao remover paciente:", error);
    }
}

// Atualiza a lista de pacientes a cada 30 segundos
setInterval(fetchPacientes, 30000);
fetchPacientes();
