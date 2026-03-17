# PayTrack — Gestão de Vendas e Recebimentos (Trufas)

Bem-vindo ao **PayTrack**! Este é o sistema que criamos para ajudar você a gerenciar suas vendas de trufas, pagamentos e saber exatamente quem te deve e quanto.

## 🚀 Como Rodar o Projeto

O jeito mais fácil de rodar tudo é usando o Docker (se estiver funcionando corretamente) ou rodando manualmente os serviços.

### Opção 1: Rodar Manualmente com Docker (Produção)

Como o `docker-compose` apresentou problemas, use estes comandos para rodar o sistema e o banco de dados separadamente em containers.

**1. Rede (Se ainda não existir):**
```bash
docker network create paytrack-net
```

**2. Banco de Dados (MySQL na porta 3307):**
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

**3. Sistema (API + Frontend):**
Se você fez alterações no código, reconstrua a imagem antes de rodar:
```bash
docker build -t paytrack-api ./backend
```
Em seguida, rode o container:
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

**Acessar:**
Abra seu navegador em: [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentação Detalhada

Como você pediu, preparei guias detalhados para você entender tudo sobre o sistema:

-   **[Manual do Usuário](docs/manual_usuario.md)**: Explica como usar o sistema no dia a dia (cadastrar clientes, vendas, pagamentos).
-   **[Guia Técnico](docs/guia_tecnico.md)**: Explica como o sistema foi construído, quais tecnologias usamos e onde estão os arquivos, caso você queira mudar algo no futuro.

## 🛠 O que tem neste projeto?

-   **Frontend (A Cara do Site):** Feito com HTML, CSS e Javascript puro. Simples, rápido e bonito.
-   **Backend (O Cérebro):** Feito em Node.js (Javascript no servidor), que recebe os dados do site e salva no banco.
-   **Banco de Dados (A Memória):** MySQL, guardando todos os seus clientes e vendas com segurança.

## 💡 Funcionalidades Principais

1.  **Dashboard:** Visão geral de quanto você tem para receber.
2.  **Clientes:** Cadastro simples de quem compra com você.
3.  **Vendas:** Registre quantas trufas cada um pegou.
4.  **Pagamentos:** Registre os PIX que caem na conta. O sistema tenta adivinhar quem pagou pelo nome!
5.  **Reconciliação:** O sistema calcula automaticamente: `Vendas - Pagamentos = Saldo`.