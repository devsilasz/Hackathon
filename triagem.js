let recognition;
const symptomsInputElement = document.getElementById("symptomsInput");
const statusFilaElement = document.getElementById("statusFila");
let userId;

// Função para registrar o paciente
async function registrarPaciente() {
    const paciente = {
        nome_completo: document.getElementById("nomeCompleto").value.trim(),
        data_nascimento: document.getElementById("dataNascimento").value,
        sexo: document.getElementById("sexo").value.trim(),
        estado_civil: document.getElementById("estadoCivil").value.trim(),
        cpf: document.getElementById("cpf").value.trim(),
        rg_ou_documento: document.getElementById("rgOuDocumento").value.trim(),
        cartao_sus: document.getElementById("cartaoSus").value.trim(),
        endereco_completo: document.getElementById("enderecoCompleto").value.trim(),
        telefone_contato: document.getElementById("telefoneContato").value.trim(),
        email: document.getElementById("email").value.trim(),
    };

    try {
        const response = await fetch('http://localhost:3000/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paciente)
        });
        const data = await response.json();

        if (data.id) {
            userId = data.id;
            console.log("ID do paciente registrado:", userId);
            statusFilaElement.textContent = data.message;
            mostrarFila();
        }
    } catch (error) {
        console.error("Erro ao registrar paciente:", error);
        statusFilaElement.textContent = "Erro ao registrar paciente.";
    }
}

// Função para entrar na fila
async function entrarNaFila() {
    if (!userId) {
        alert("Por favor, registre-se primeiro.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/fila', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: document.getElementById("nomeCompleto").value })
        });
        const data = await response.json();

        localStorage.setItem("userId", data.id);
        statusFilaElement.textContent = `Você entrou na fila com o ID ${data.id}.`;
        mostrarSintomas();
    } catch (error) {
        console.error("Erro ao entrar na fila:", error);
    }
}

// Função para exibir a interface de fila
function mostrarFila() {
    document.getElementById('registroContainer').style.display = 'none';
    document.getElementById('filaContainer').style.display = 'block';
}

// Função para exibir a interface de sintomas
function mostrarSintomas() {
    document.getElementById('filaContainer').style.display = 'none';
    document.getElementById('sintomasContainer').style.display = 'block';
}

// Função para iniciar o reconhecimento de voz
function startRecording() {
    if (!("webkitSpeechRecognition" in window)) {
        alert("API de reconhecimento de voz não é suportada neste navegador.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        symptomsInputElement.placeholder = "Ouvindo...";
    };

    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        symptomsInputElement.value = text;
    };

    recognition.onerror = function(event) {
        console.error("Erro no reconhecimento de voz: ", event.error);
        symptomsInputElement.placeholder = "Erro no reconhecimento. Tente novamente.";
    };

    recognition.start();
}

// Função para análise e envio de sintomas
async function enviarSintomas() {
    const symptomsText = symptomsInputElement.value.trim();
    if (!symptomsText) {
        alert("Por favor, digite ou fale seus sintomas antes de prosseguir.");
        return;
    }

    try {
        await fetch(`http://localhost:3000/fila/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sintomas: symptomsText })
        });

        alert("Sintomas enviados com sucesso.");
        redirecionarParaEspera();
    } catch (error) {
        console.error("Erro ao enviar sintomas:", error);
    }
}

// Função para redirecionar para a tela de espera
function redirecionarParaEspera() {
    document.getElementById('sintomasContainer').style.display = 'none';
    document.getElementById('telaEsperaContainer').style.display = 'block';
}
