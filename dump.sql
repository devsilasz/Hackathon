CREATE TABLE Paciente (
    id_paciente UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    sexo TEXT NOT NULL,
    estado_civil TEXT NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    rg_ou_documento VARCHAR(20) NOT NULL,
    cartao_sus VARCHAR(20),
    endereco_completo VARCHAR(255) NOT NULL,
    telefone_contato VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Condicoes_Previas (
    id_condicoes_previas UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES Paciente(id_paciente),
    alergias TEXT,
    uso_de_medicamentos TEXT,
    condicoes_pre_existentes TEXT
);

CREATE TABLE Diagnosticos (
    uuid_atendimento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES Paciente(id_paciente),
    revisado BOOLEAN DEFAULT FALSE,
    descricao_dos_sintomas TEXT,
    nivel_de_prioridade TEXT NOT NULL,
    id_condicoes_previas UUID REFERENCES Condicoes_Previas(id_condicoes_previas)
);

