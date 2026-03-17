# 📚 PayTrack — Guia Completo do Projeto

> Este documento foi feito para quem está chegando agora no projeto. Aqui você vai entender **o que é**, **por que existe**, **como funciona por dentro**, **como rodar** e **onde mexer** quando precisar mudar algo.

---

## Índice

1. [O que é o PayTrack?](#1-o-que-é-o-paytrack)
2. [Regras de Negócio](#2-regras-de-negócio)
3. [Como o Sistema Funciona (Visão Geral)](#3-como-o-sistema-funciona-visão-geral)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Tecnologias Utilizadas](#5-tecnologias-utilizadas)
6. [Banco de Dados — As "Tabelas" do Sistema](#6-banco-de-dados--as-tabelas-do-sistema)
7. [A API — As Rotas do Sistema](#7-a-api--as-rotas-do-sistema)
8. [O Frontend — As Telas do Sistema](#8-o-frontend--as-telas-do-sistema)
9. [Autenticação e Segurança](#9-autenticação-e-segurança)
10. [Importação de Dados via CSV](#10-importação-de-dados-via-csv)
11. [Como Rodar o Projeto](#11-como-rodar-o-projeto)
12. [Fluxo Completo de uma Venda](#12-fluxo-completo-de-uma-venda)
13. [O que Ainda Pode Ser Melhorado](#13-o-que-ainda-pode-ser-melhorado)

---

## 1. O que é o PayTrack?

O **PayTrack** é um sistema web para **controle de vendas de trufas**. Ele foi criado para resolver um problema real do dia a dia: quando você vende trufas para várias pessoas, precisa saber:

- Quem comprou e quanto?
- Quem já pagou e quem ainda deve?
- Quanto já entrou no caixa este mês?

Em vez de usar cadernos, planilhas ou "memória", o PayTrack centraliza tudo isso numa tela simples, acessível pelo navegador.

**O sistema possui duas "caras":**

| Área | Quem usa | Para quê |
|---|---|---|
| **Painel Admin** (`/index.html`) | Dono do negócio | Ver saldos, gerenciar vendas, clientes, pagamentos, produtos e pedidos |
| **Loja Pública** (`/store.html`) | Clientes | Ver os produtos disponíveis e fazer um pedido |

---

## 2. Regras de Negócio

Estas são as **regras** que definem como o sistema se comporta. Entendê-las é essencial antes de mexer no código.

### 2.1 Tipos de Produto (Trufa)

Existem dois tipos de trufa, cada um com uma tabela de preço diferente:

| Tipo | Regra de Preço |
|---|---|
| **Normal** | R$ 5,00 por unidade, 5 unidades R$20,00 |
| **Fit** | 1 unidade = R$ 8,00 / Par (2 unidades) = R$ 15,00 |

**Exemplo prático — Trufa Fit:**
- Pedido de **3 unidades Fit** → 1 par (R$ 15,00) + 1 avulsa (R$ 8,00) = **R$ 23,00 total**
- O preço unitário guardado no banco será `23,00 ÷ 3 = R$ 7,666...`

> ⚠️ O sistema calcula o preço automaticamente se você não informar um preço manualmente. Isso acontece tanto na criação quanto na edição de uma venda.

### 2.2 Saldo do Cliente (Reconciliação)

O conceito central do sistema é simples:

$$\text{Saldo devedor} = \text{Total consumido} - \text{Total pago}$$

- Se o saldo for **positivo** → o cliente ainda deve dinheiro.
- Se o saldo for **negativo** → o cliente pagou mais do que devia (crédito).
- Se for **zero** → está quite.

O Dashboard mostra apenas clientes com saldo pendente (maior que zero).

### 2.3 Reconciliação Automática de Pagamento

Quando um pagamento é registrado com o nome do pagador (campo `payer_name`), o sistema **tenta encontrar automaticamente** o cliente correspondente fazendo uma comparação de nome (sem diferenciar maiúsculas/minúsculas).

- Se encontrar: o pagamento é vinculado ao cliente automaticamente.
- Se não encontrar: o pagamento é salvo como **não vinculado** (aparece sem cliente associado).

> 💡 Isso é especialmente útil na **importação de extrato bancário**, onde o nome que aparece no PIX pode não bater exatamente com o cadastrado.

### 2.4 Fluxo de um Pedido da Loja

A loja pública funciona assim:

1. O cliente acessa `store.html`, escolhe os produtos e informa seu nome + telefone.
2. O pedido é criado com status **`PENDING`** (pendente).
3. O admin vê o pedido no painel e, quando entregar fisicamente, clica em "Completar".
4. Ao completar:
   - O **estoque** de cada produto é decrementado.
   - Uma **venda** é registrada automaticamente no histórico.
   - O cliente é **criado automaticamente** se não existir no cadastro.
   - O pedido passa para o status **`COMPLETED`**.

> Os pedidos cancelados (`CANCELED`) estão previstos no modelo, mas a funcionalidade de cancelamento ainda não está implementada na interface.

### 2.5 Criação Automática de Clientes

Em vários lugares do sistema, se você informa o nome de um cliente que ainda não existe, o sistema **cria o cliente automaticamente**. Isso acontece em:

- Criação de venda pelo painel (campo `client_name`)
- Importação de vendas via CSV
- Conclusão de pedido da loja

---

## 3. Como o Sistema Funciona (Visão Geral)

Imagine o sistema dividido em três camadas que se comunicam:

```
┌─────────────────────────────────────────────────┐
│  NAVEGADOR DO USUÁRIO                           │
│  (Arquivos HTML/CSS/JS em /frontend)            │
│  - O que a pessoa VÊ e CLICA                    │
└──────────────────────┬──────────────────────────┘
                       │ Requisições HTTP (API)
                       ▼
┌─────────────────────────────────────────────────┐
│  SERVIDOR (Node.js/Express em /backend/src)     │
│  - Recebe os pedidos do navegador               │
│  - Aplica as regras de negócio                  │
│  - Salva ou busca dados no banco                │
└──────────────────────┬──────────────────────────┘
                       │ Sequelize (ORM)
                       ▼
┌─────────────────────────────────────────────────┐
│  BANCO DE DADOS (MySQL)                         │
│  - Guarda todos os dados de forma permanente    │
│  - Clientes, Vendas, Pagamentos, Produtos...    │
└─────────────────────────────────────────────────┘
```

**Glossário rápido:**
- **API**: Interface pela qual o navegador "conversa" com o servidor, através de endereços como `/api/sales`.
- **HTTP**: O protocolo de comunicação da internet. Cada ação é um tipo de requisição: `GET` (buscar), `POST` (criar), `PUT` (editar), `DELETE` (apagar).
- **ORM (Sequelize)**: Uma camada que traduz código JavaScript para comandos SQL do banco de dados, sem você precisar escrever SQL manualmente.
- **JWT (Token)**: Um "crachá digital" que o servidor emite no login. O navegador guarda esse crachá e o envia em toda requisição para provar que está autenticado.

---

## 4. Estrutura de Pastas

```
PayTrack/
│
├── docker-compose.yml      ← Sobe banco + servidor com um comando
├── README.md               ← Resumo rápido de como rodar
│
├── backend/                ← Todo o servidor (Node.js)
│   ├── Dockerfile          ← "Receita" para criar o container do servidor
│   ├── package.json        ← Lista de dependências do projeto
│   ├── create-admin.js     ← Script para criar o usuário admin inicial
│   │
│   └── src/                ← Código-fonte principal
│       ├── app.js          ← PONTO DE ENTRADA: inicia o servidor
│       ├── config/
│       │   └── database.js ← Configura a conexão com o MySQL
│       ├── models/         ← Define as tabelas do banco de dados
│       │   ├── index.js    ← Junta todos os modelos e define os relacionamentos
│       │   ├── User.js     ← Tabela de usuários (admin)
│       │   ├── Order.js    ← Tabela de pedidos
│       │   ├── OrderItem.js← Tabela dos itens de cada pedido
│       │   └── Product.js  ← Tabela de produtos
│       ├── controllers/    ← Lógica de cada recurso
│       │   ├── authController.js     ← Login e criação de admin
│       │   ├── clientController.js   ← CRUD de clientes
│       │   ├── saleController.js     ← CRUD de vendas + importação CSV
│       │   ├── paymentController.js  ← CRUD de pagamentos + importação CSV
│       │   ├── productController.js  ← CRUD de produtos
│       │   ├── orderController.js    ← Criação e conclusão de pedidos
│       │   └── reportController.js   ← Relatório de saldos por cliente
│       ├── middleware/
│       │   └── auth.js     ← Verifica se o usuário está autenticado (JWT)
│       ├── routes/         ← Define quais URLs existem na API
│       │   ├── auth.js
│       │   ├── clients.js
│       │   ├── sales.js
│       │   ├── payments.js
│       │   ├── products.js
│       │   └── orders.js
│       └── services/       ← Lógica complexa isolada
│           ├── csvService.js       ← Processa extrato bancário (PIX)
│           └── salesCsvService.js  ← Processa planilha de vendas
│
├── frontend/               ← Interface visual (HTML/CSS/JS puro)
│   ├── index.html          ← Painel administrativo principal
│   ├── login.html          ← Tela de login
│   ├── store.html          ← Loja pública para clientes
│   ├── style.css           ← Estilos visuais de todo o projeto
│   └── app.js              ← Toda a lógica JavaScript do painel admin
│
└── docs/                   ← Documentação
    ├── manual_usuario.md
    ├── guia_tecnico.md
    └── GUIA_COMPLETO.md    ← Você está aqui
```

---

## 5. Tecnologias Utilizadas

### Backend

| Tecnologia | O que faz no projeto |
|---|---|
| **Node.js** | Ambiente para rodar JavaScript no servidor (fora do navegador) |
| **Express.js** | Framework que cria as rotas da API (os endereços `/api/...`) |
| **Sequelize** | ORM — faz a ponte entre o código JS e o banco MySQL |
| **MySQL 8.0** | Banco de dados relacional onde tudo é salvo |
| **JWT (jsonwebtoken)** | Gera e valida os tokens de autenticação |
| **bcryptjs** | Criptografa as senhas antes de salvar no banco |
| **Multer** | Recebe uploads de arquivos (CSV) |
| **csv-parser** | Lê e interpreta arquivos `.csv` |
| **iconv-lite** | Converte encodings de arquivo (para ler CSVs em Windows-1252) |
| **nodemon** | Reinicia o servidor automaticamente ao salvar um arquivo (dev) |

### Frontend

| Tecnologia | O que faz no projeto |
|---|---|
| **HTML5** | Estrutura das páginas |
| **CSS3** | Estilo visual (tema escuro, responsividade) |
| **JavaScript puro** | Lógica das telas: chamadas à API, renderização da tabela, modais |
| **Google Fonts (Outfit)** | Fonte tipográfica usada no projeto |

### Infraestrutura

| Tecnologia | O que faz no projeto |
|---|---|
| **Docker** | Empacota o servidor e o banco em "containers" isolados |
| **Docker Compose** | Orquestra os containers (sobe banco + servidor juntos) |

---

## 6. Banco de Dados — As "Tabelas" do Sistema

O banco de dados se chama `paytrack`. Abaixo estão todas as tabelas (chamadas de **Models** no código) e o que cada coluna representa.

### Tabela: `Clients` (Clientes)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `name` | Texto | Nome do cliente (**obrigatório**) |
| `phone` | Texto | Telefone (opcional) |

### Tabela: `Sales` (Vendas)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `client_id` | Inteiro (FK) | Referência ao cliente |
| `product_type` | Texto | `"Normal"` ou `"Fit"` |
| `quantity` | Inteiro | Quantidade vendida |
| `unit_price` | Decimal | Preço unitário calculado |
| `date` | Data/hora | Data da venda |

### Tabela: `Payments` (Pagamentos)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `client_id` | Inteiro (FK) | Referência ao cliente (pode ser nulo) |
| `payer_name` | Texto | Nome de quem pagou (**obrigatório**) |
| `amount` | Decimal | Valor pago |
| `date` | Data | Data do pagamento |

### Tabela: `Users` (Usuários Admin)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `username` | Texto | Nome de usuário (único) |
| `password` | Texto | Senha **criptografada** com bcrypt |

> ⚠️ A senha nunca é salva em texto puro no banco. O bcrypt transforma `"password123"` em algo como `"$2a$10$..."`.

### Tabela: `Products` (Produtos)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `name` | Texto | Nome do produto |
| `description` | Texto | Descrição (opcional) |
| `type` | Texto | `"Normal"` ou `"Fit"` |
| `price` | Decimal | Preço unitário |
| `stock` | Inteiro | Quantidade em estoque |
| `active` | Booleano | Se o produto aparece na loja |
| `image_url` | Texto | URL de uma imagem (opcional) |

### Tabela: `Orders` (Pedidos)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `client_id` | Inteiro (FK) | Vinculado ao cliente (preenchido ao completar) |
| `client_name` | Texto | Nome digitado pelo cliente na loja |
| `client_phone` | Texto | Telefone digitado na loja |
| `status` | Enum | `PENDING`, `COMPLETED` ou `CANCELED` |
| `total` | Decimal | Valor total do pedido |
| `date` | Data/hora | Data/hora do pedido |

### Tabela: `OrderItems` (Itens do Pedido)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | Inteiro (auto) | Identificador único |
| `order_id` | Inteiro (FK) | Referência ao pedido |
| `product_id` | Inteiro (FK) | Referência ao produto |
| `quantity` | Inteiro | Quantidade deste produto no pedido |
| `unit_price` | Decimal | Preço no momento do pedido |

### Diagrama de Relacionamentos

```
Users          (sem relação direta com o restante)

Clients
  ├──< Sales       (1 cliente tem muitas vendas)
  ├──< Payments    (1 cliente tem muitos pagamentos)
  └──< Orders      (1 cliente tem muitos pedidos)

Orders
  └──< OrderItems  (1 pedido tem muitos itens)

Products
  └──< OrderItems  (1 produto aparece em muitos itens)
```

---

## 7. A API — As Rotas do Sistema

A API é acessível em `http://localhost:3000/api/...`. Abaixo estão todas as rotas disponíveis.

> **Legenda:** 🔓 = Público (sem login) | 🔐 = Requer token JWT no cabeçalho

### Autenticação (`/api/auth`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/login` | 🔓 | Faz login, retorna o token JWT |
| `POST` | `/api/auth/setup` | 🔓 | Cria o primeiro admin (só funciona se não houver usuário) |

### Clientes (`/api/clients`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/clients` | 🔓 | Lista todos os clientes |
| `POST` | `/api/clients` | 🔓 | Cria um cliente |
| `GET` | `/api/clients/:id` | 🔓 | Busca um cliente por ID |
| `PUT` | `/api/clients/:id` | 🔓 | Edita um cliente |
| `DELETE` | `/api/clients/:id` | 🔓 | Apaga um cliente |

### Vendas (`/api/sales`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/sales` | 🔓 | Lista todas as vendas (com dados do cliente) |
| `POST` | `/api/sales` | 🔓 | Cria uma venda (aceita `client_name` para criar cliente automaticamente) |
| `GET` | `/api/sales/:id` | 🔓 | Busca venda por ID |
| `PUT` | `/api/sales/:id` | 🔓 | Edita uma venda (recalcula preço automaticamente) |
| `DELETE` | `/api/sales/:id` | 🔓 | Apaga uma venda |
| `POST` | `/api/sales/batch-delete` | 🔓 | Apaga várias vendas de uma vez (envia `{ ids: [1,2,3] }`) |
| `POST` | `/api/sales/import` | 🔓 | Importa vendas de um arquivo CSV (multipart/form-data) |

### Pagamentos (`/api/payments`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/payments` | 🔓 | Lista todos os pagamentos |
| `POST` | `/api/payments` | 🔓 | Registra um pagamento (tenta vincular ao cliente pelo nome) |
| `GET` | `/api/payments/:id` | 🔓 | Busca pagamento por ID |
| `PUT` | `/api/payments/:id` | 🔓 | Edita um pagamento |
| `DELETE` | `/api/payments/:id` | 🔓 | Apaga um pagamento |
| `POST` | `/api/payments/batch-delete` | 🔓 | Apaga vários pagamentos de uma vez |
| `POST` | `/api/payments/import` | 🔓 | Importa extrato bancário (PIX) em CSV |

### Relatórios (`/api/reports`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/reports/balances` | 🔓 | Retorna saldo de todos os clientes (consumido, pago, saldo) |

### Produtos (`/api/products`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/products` | 🔓 | Lista todos os produtos |
| `POST` | `/api/products` | 🔓 | Cria um produto |
| `GET` | `/api/products/:id` | 🔓 | Busca produto por ID |
| `PUT` | `/api/products/:id` | 🔓 | Edita um produto |
| `DELETE` | `/api/products/:id` | 🔓 | Apaga um produto |

### Pedidos (`/api/orders`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/orders` | 🔓 | Cria um pedido (usado pela loja) |
| `GET` | `/api/orders` | 🔐 | Lista pedidos pendentes (só admin) |
| `POST` | `/api/orders/:id/complete` | 🔐 | Completa um pedido (desconta estoque, cria venda) |

---

## 8. O Frontend — As Telas do Sistema

O frontend é composto por 3 arquivos HTML e um único JavaScript (`app.js`) que controla o painel admin.

### `login.html` — Tela de Login

Exibida ao acessar `/login.html`. O usuário digita usuário e senha. Se corretos, o sistema:

1. Recebe o **token JWT** do servidor.
2. Salva o token no `localStorage` do navegador.
3. Redireciona para `index.html`.

Se não houver token salvo, o `index.html` redireciona automaticamente para o login.

### `index.html` + `app.js` — Painel Administrativo

É uma **SPA (Single Page Application)**: uma única página que muda o conteúdo dinamicamente sem recarregar o navegador. O menu lateral tem as seções:

| Seção | O que faz |
|---|---|
| 📊 **Dashboard** | Mostra cards com Total a Receber, Vendas do Mês, Recebido do Mês e tabela de saldos pendentes |
| 👥 **Clientes** | Lista, cria, edita e apaga clientes |
| 💰 **Vendas** | Lista, cria, edita, apaga (individual ou em lote) e importa vendas via CSV |
| 💸 **Pagamentos** | Lista, cria, edita, apaga (individual ou em lote) e importa extrato bancário via CSV |
| 🍫 **Produtos** | Lista e gerencia o catálogo de produtos da loja |
| 🔔 **Pedidos** | Mostra pedidos pendentes da loja e permite completá-los |

### `store.html` — Loja Pública

Acessível por qualquer pessoa, sem login. Funciona como um cardápio interativo:

1. Lista os produtos cadastrados e com estoque > 0.
2. O cliente adiciona itens ao carrinho (barra inferior fixa).
3. Ao finalizar, um modal pede **nome e telefone**.
4. O pedido é enviado para a API e aparece no painel do admin.

---

## 9. Autenticação e Segurança

### Como o Login Funciona

```
1. Usuário digita usuário + senha em /login.html
2. Frontend envia POST /api/auth/login
3. Servidor verifica no banco se o usuário existe
4. Servidor compara a senha usando bcrypt (nunca compara texto puro)
5. Se correto: gera um token JWT com validade de 8 horas
6. Frontend salva o token no localStorage
7. Em toda requisição protegida, o frontend envia:
   Header: Authorization: Bearer <token>
8. O middleware auth.js verifica se o token é válido
```

### Criar o Primeiro Admin

O sistema não tem uma interface de cadastro de usuário. Para criar o admin inicial, existe o script `backend/create-admin.js`. Rode dentro do container:

```bash
# Se estiver usando Docker
docker exec -it paytrack-api node create-admin.js
```

Isso cria o usuário `admin` com senha `password123`. **Troque a senha depois!**

Alternativamente, existe a rota `POST /api/auth/setup` que cria o admin pela API, mas **só funciona se não houver nenhum usuário cadastrado**.

### Ponto de Atenção — JWT Secret

No arquivo `backend/src/middleware/auth.js` e `backend/src/controllers/authController.js`, a chave secreta do JWT tem um fallback inseguro:

```javascript
const SECRET_KEY = process.env.JWT_SECRET || 'paytrack_secret_key_change_me';
```

Em produção, **sempre defina a variável de ambiente `JWT_SECRET`** com uma string aleatória e longa. Nunca use o valor padrão em produção.

---

## 10. Importação de Dados via CSV

O sistema tem dois importadores de CSV diferentes, cada um para um propósito.

### 10.1 Importar Vendas (`/api/sales/import`)

Serve para importar uma planilha de pedidos (como um Google Forms de pedidos).

**Colunas esperadas no CSV** (o sistema é flexível com nomes de colunas):

| O que é | Nomes aceitos na coluna |
|---|---|
| Data/hora | `carimbo`, `timestamp`, `data/hora`, `data` |
| Nome do cliente | `nome`, `cliente`, `name` |
| Quantidade | `quantidade`, `qtd`, `quantity` |
| Tipo (Fit/Normal) | `tipo`, `type`, `trufa` |
| Pagou em dinheiro? | `dinheiro`, `cash`, `pagamento` |

**O que o importador faz:**
- Cria o cliente automaticamente se não existir.
- Calcula o preço conforme o tipo (Normal/Fit).
- Converte datas no formato `DD/MM/YYYY HH:MM:SS`.
- **Ignora duplicatas** (mesma venda não é importada duas vezes).
- Se a coluna "dinheiro" for `"Sim"`, cria um pagamento automaticamente.

### 10.2 Importar Extrato Bancário (`/api/payments/import`)

Serve para importar um extrato de PIX recebidos, exportado do banco.

**Formato esperado:** CSV com encoding **Windows-1252** (padrão de exportação de bancos brasileiros), com colunas:

| Coluna | Exemplo |
|---|---|
| `data` | `03/11/2025` |
| `lançamento` | `Pix - Recebido` |
| `detalhes` | `03/11 10:46 72040777172 VANIA QUERINO` |
| `valor` | `660,00` |
| `tipo lançamento` | `Entrada` |

**O que o importador faz:**
- Filtra apenas linhas com `tipo lançamento = "Entrada"`.
- Extrai o nome do pagador do campo `detalhes`.
- Tenta vincular ao cliente pelo nome (busca parcial).
- **Ignora duplicatas**.
- Sempre cria o pagamento, mesmo sem vincular ao cliente.

---

## 11. Como Rodar o Projeto

### Pré-requisitos

- **Docker** instalado na máquina ([instalar Docker](https://docs.docker.com/get-docker/))
- Ou **Node.js 18+** e **MySQL 8** instalados localmente

---

### Opção A: Usando Docker (Recomendado)

**Passo 1 — Criar a rede:**
```bash
docker network create paytrack-net
```

**Passo 2 — Subir o banco de dados:**
```bash
docker run -d \
  --name paytrack-db \
  --network paytrack-net \
  --restart always \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=paytrack \
  -e MYSQL_USER=paytrack \
  -e MYSQL_PASSWORD=paytrackpassword \
  -p 3307:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

**Passo 3 — Construir a imagem do servidor:**
```bash
docker build -t paytrack-api ./backend
```

**Passo 4 — Subir o servidor:**
```bash
docker run -d \
  --name paytrack-api \
  --network paytrack-net \
  -p 3000:3000 \
  -v "$(pwd)/backend:/app" \
  -v /app/node_modules \
  -v "$(pwd)/frontend:/app/frontend" \
  -e DB_HOST=paytrack-db \
  -e DB_USER=paytrack \
  -e DB_PASSWORD=paytrackpassword \
  -e DB_NAME=paytrack \
  -e PORT=3000 \
  paytrack-api \
  npm start
```

**Passo 5 — Criar o usuário admin:**
```bash
docker exec -it paytrack-api node create-admin.js
```

**Passo 6 — Acessar:**
Abra o navegador em: **http://localhost:3000**

Login: `admin` / Senha: `password123`

---

### Opção B: Rodando Localmente (Sem Docker)

**Pré-requisitos:** Node.js 18+, MySQL 8 rodando localmente.

**Passo 1 — Criar o banco:**
```sql
CREATE DATABASE paytrack;
CREATE USER 'paytrack'@'localhost' IDENTIFIED BY 'paytrackpassword';
GRANT ALL PRIVILEGES ON paytrack.* TO 'paytrack'@'localhost';
```

**Passo 2 — Instalar dependências:**
```bash
cd backend
npm install
```

**Passo 3 — Configurar variáveis de ambiente:**
Crie o arquivo `backend/.env`:
```
DB_HOST=localhost
DB_USER=paytrack
DB_PASSWORD=paytrackpassword
DB_NAME=paytrack
PORT=3000
JWT_SECRET=uma_chave_secreta_longa_aqui
```

**Passo 4 — Criar o admin e rodar:**
```bash
node create-admin.js
npm run dev
```

**Passo 5 — Acessar:**
**http://localhost:3000**

---

## 12. Fluxo Completo de uma Venda

Para entender o sistema na prática, veja o que acontece passo a passo quando uma venda é registrada:

```
USUÁRIO clica em "Nova Venda" no painel
        │
        ▼
FRONTEND (app.js) abre um modal e coleta os dados:
  - Nome do cliente (texto)
  - Quantidade
  - Tipo (Normal / Fit)
  - Data
        │
        ▼
FRONTEND envia: POST /api/sales
  { client_name: "Ana", quantity: 3, product_type: "Fit", date: "..." }
        │
        ▼
BACKEND (saleController.js) recebe a requisição:
  1. Busca "Ana" no banco (case-insensitive)
  2. Se não encontrar, CRIA o cliente "Ana"
  3. Calcula o preço:
     - 3 trufas Fit = 1 par (R$15) + 1 avulsa (R$8) = R$23
     - unit_price = 23 / 3 = R$7,666...
  4. Salva a venda no banco
  5. Retorna JSON com os dados da venda criada
        │
        ▼
FRONTEND recebe a resposta e atualiza a tabela na tela
        │
        ▼
BANCO DE DADOS agora tem:
  - Clients: { id: 1, name: "Ana" }  (se era nova)
  - Sales: { client_id: 1, quantity: 3, unit_price: 7.666, product_type: "Fit" }
        │
        ▼
Dashboard agora mostra Ana com saldo de R$23,00 a receber
```

---

## 13. O que Ainda Pode Ser Melhorado

O projeto está funcional, mas há pontos de evolução já visíveis no código:

| Situação | Descrição |
|---|---|
| **Cancelamento de pedidos** | O campo `status = CANCELED` existe no banco, mas não há botão/rota para cancelar |
| **Proteção de rotas no frontend** | A maioria das rotas de API não exige autenticação (`🔓`), o que significa que qualquer pessoa com o endereço pode fazer requisições |
| **Controle de estoque negativo** | Ao completar um pedido, se o estoque for insuficiente, o sistema permite ficar negativo (há um comentário no código indicando isso) |
| **JWT Secret fixo** | A chave secreta tem um fallback em texto puro no código — deve ser configurada via variável de ambiente em produção |
| **Sem paginação** | As listagens retornam todos os registros de uma vez. Em volume alto de dados, isso pode ser lento |
| **Repositórios vazios** | A pasta `backend/src/repositories/` existe mas está vazia — provavelmente era para uma refatoração da camada de dados |
| **Sem testes automatizados** | Não há testes unitários ou de integração no projeto |

---

*Última atualização: Fevereiro de 2026*
