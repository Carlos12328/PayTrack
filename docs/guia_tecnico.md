# ⚙️ Guia Técnico - PayTrack

Este documento é para você entender como o sistema funciona "por baixo do capô". Útil se você quiser estudar o código ou fazer alterações.

---

## 1. Tecnologias Usadas

O projeto usa uma "Stack" (conjunto de tecnologias) moderna e simples:

-   **Node.js:** É o ambiente que roda o Javascript fora do navegador. Usamos para criar o servidor (Backend).
-   **Express:** É uma biblioteca do Node.js que facilita criar as rotas da API (os endereços que o site chama).
-   **MySQL:** É o banco de dados onde as informações ficam salvas permanentemente.
-   **Sequelize:** É uma ferramenta (ORM) que ajuda o Node.js a conversar com o MySQL usando Javascript em vez de comandos SQL complicados.
-   **Vanilla JS (Frontend):** O site em si não usa frameworks pesados (como React ou Angular). É Javascript puro, leve e rápido.

## 2. Estrutura de Pastas

```
PayTrack/
├── backend/              # Onde fica o código do servidor
│   ├── src/
│   │   ├── config/       # Configuração do banco de dados
│   │   ├── controllers/  # A lógica (o que fazer quando receber um pedido)
│   │   ├── models/       # Definição das tabelas (Cliente, Venda, etc.)
│   │   ├── routes/       # Os endereços da API (ex: /api/clients)
│   │   └── app.js        # O arquivo principal que liga tudo
│   ├── package.json      # Lista de dependências (bibliotecas instaladas)
│   └── Dockerfile        # Receita para criar o container do backend
├── frontend/             # Onde fica o código do site
│   ├── index.html        # A estrutura da página
│   ├── style.css         # O visual (cores, fontes)
│   └── app.js            # A lógica da tela (clicar em botão, buscar dados)
├── docs/                 # Documentação (onde você está lendo isso)
└── docker-compose.yml    # Arquivo que sobe o banco e o sistema juntos
```

## 3. Banco de Dados

Temos 3 tabelas principais:

1.  **Clients (Clientes):** `id`, `name`, `phone`.
2.  **Sales (Vendas):** `id`, `client_id` (quem comprou), `quantity`, `unit_price`, `date`.
3.  **Payments (Pagamentos):** `id`, `payer_name` (nome no banco), `amount`, `date`, `client_id` (quem pagou).

## 4. Como funciona a "Mágica" (Reconciliação)

Quando você registra um pagamento sem selecionar o cliente:
1.  O Backend recebe o `payer_name` (ex: "Carlos Eduardo").
2.  Ele transforma tudo em minúsculo ("carlos eduardo").
3.  Ele procura no banco de dados se existe algum cliente com esse nome exato.
4.  Se achar, ele salva o `client_id` nesse pagamento automaticamente.
5.  Se não achar, o pagamento fica salvo "solto" (sem dono) até você editar e vincular a alguém.
