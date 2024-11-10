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

// Função para formatar o diagnóstico
function formatarDiagnostico(diagnostico) {
    const partes = {};

    // Expressões regulares para separar as partes do diagnóstico
    const regexDoencas = /Doenças ou Intolerâncias Prévias: ([^S]*)/;
    const regexSintomas = /Sintomas do Paciente: ([^P]*)/;
    const regexDoencasPrincipais = /Principais doenças:([\s\S]*?)Possíveis tratamentos/;
    const regexTratamentos = /Possíveis tratamentos para as respectivas doenças:([\s\S]*?)(\*Nota:)/;
    const regexNota = /\*Nota: ([^\*]*)/;

    // Extração com base nas expressões regulares
    partes.doencas = diagnostico.match(regexDoencas) ? diagnostico.match(regexDoencas)[1] : 'Não informado';
    partes.sintomas = diagnostico.match(regexSintomas) ? diagnostico.match(regexSintomas)[1] : 'Não informado';
    partes.doencasPrincipais = diagnostico.match(regexDoencasPrincipais) ? diagnostico.match(regexDoencasPrincipais)[1].trim() : 'Não informado';
    partes.tratamentos = diagnostico.match(regexTratamentos) ? diagnostico.match(regexTratamentos)[1].trim() : 'Não informado';
    partes.nota = diagnostico.match(regexNota) ? diagnostico.match(regexNota)[1] : '';

    // Formatar a string em HTML
    return `
        <h4>Doenças ou Intolerâncias Prévias:</h4>
        <p>${partes.doencas}</p>
        <h4>Sintomas do Paciente:</h4>
        <p>${partes.sintomas}</p>
        <h4>Principais Doenças:</h4>
        <ul>
            ${partes.doencasPrincipais.split('\n').map(item => `<li>${item}</li>`).join('')}
        </ul>
        <h4>Possíveis Tratamentos:</h4>
        <ul>
            ${partes.tratamentos.split('\n').map(item => `<li>${item}</li>`).join('')}
        </ul>
        ${partes.nota ? `<p><strong>Nota:</strong> ${partes.nota}</p>` : ''}
    `;
}

// Exemplo de uso ao inserir no HTML:
async function fetchPacientes() {
    try {
        const response = await fetch("http://localhost:3000/fila");
        const pacientes = await response.json();

        // Limpa o container antes de adicionar novos cards
        cardsContainer.innerHTML = '';

        pacientes.forEach(paciente => {
            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <h3>Paciente: ${paciente.nome}</h3>
                <p><strong>Doenças ou Intolerâncias Prévias:</strong> ${paciente.doencasIntolerancias || "Não informado"}</p>
                <p><strong>Sintomas:</strong> ${paciente.sintomas || "Aguardando sintomas..."}</p>
                <p><strong>Diagnóstico:</strong><br> ${formatarDiagnostico(paciente.diagnostico)}</p>
                <label>
                    <input type="checkbox" class="checkbox-revisao" data-id="${paciente.id}">
                    Revisado por um profissional
                </label>
                <button class="resolved-button" onclick="removerPaciente(${paciente.id})">Resolvido</button>
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
