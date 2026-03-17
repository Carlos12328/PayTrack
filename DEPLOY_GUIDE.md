# Guia de Deploy Web para o PayTrack

Este guia explica como colocar seu sistema PayTrack na internet para que você e seus clientes possam acessá-lo de qualquer lugar.

Vamos usar serviços que possuem planos gratuitos ("Free Tier") e são fáceis de configurar.

## Visão Geral da Arquitetura
Como nosso sistema tem Banco de Dados, Backend e Frontend, vamos dividir em 3 partes:
1.  **Banco de Dados (MySQL)**: Vamos usar o **Aiven** ou **Clever Cloud** (Plano Gratuito).
2.  **Backend (API)**: Vamos usar o **Render.com** (Plano Gratuito).
3.  **Frontend (Site)**: Vamos usar o **Netlify** (Plano Gratuito).

---

## Passo 1: Preparar o Código no GitHub 🐙
Você já está usando Git. Certifique-se de enviar (push) seu código atualizado para um repositório no GitHub.

1.  Crie um repositório no [GitHub](https://github.com).
2.  Envie seu código para lá:
    ```bash
    git add .
    git commit -m "Preparando para deploy"
    git remote add origin https://github.com/SEU_USUARIO/PayTrack.git
    git push -u origin main
    ```

---

## Passo 2: Banco de Dados na Nuvem (Aiven) 🗄️
Precisamos de um MySQL acessível pela internet.

1.  Crie uma conta no [Aiven.io](https://aiven.io/).
2.  Crie um novo serviço **MySQL** (selecione o plano "Free" se disponível, ou use o Trial).
    *   *Alternativa 100% Free:* [Clever Cloud](https://www.clever-cloud.com/) oferece um banco MySQL pequeno gratuito. Ou [PlanetScale](https://planetscale.com/) (embora agora seja pago em alguns casos).
    *   *Recomendação:* Para testes, o **Clever Cloud** é ótimo.
3.  Anote as credenciais fornecidas:
    *   **Host** (ex: `mysql-paytrack.services.clever-cloud.com`)
    *   **Port** (ex: `3306`)
    *   **User**
    *   **Password**
    *   **Database Name**

---

## Passo 3: Backend no Render.com ⚙️
O Backend é o "cérebro" que conecta no banco.

1.  Crie uma conta no [Render.com](https://render.com/).
2.  Clique em **"New +"** e selecione **"Web Service"**.
3.  Conecte seu repositório do GitHub (`PayTrack`).
4.  Configure:
    *   **Name:** `paytrack-api`
    *   **Root Directory:** `backend` (Importante! Pois seu `package.json` está dentro dessa pasta).
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
    *   **Instance Type:** Free
5.  **Variáveis de Ambiente (Environment Variables):**
    Role para baixo até "Environment Variables" e adicione:
    *   `DB_HOST`: (Host do passo 2)
    *   `DB_USER`: (User do passo 2)
    *   `DB_PASSWORD`: (Password do passo 2)
    *   `DB_NAME`: (Database Name do passo 2)
    *   `DB_PORT`: `3306`
    *   `JWT_SECRET`: `uma_senha_super_secreta_e_longa`
6.  Clique em **Create Web Service**.
7.  Aguarde o deploy. O Render vai te dar uma URL (ex: `https://paytrack-api.onrender.com`). **Copie essa URL.**

---

## Passo 4: Atualizar o Frontend 🌐
Agora precisamos dizer para o Frontend (HTML/JS) conversar com o Backend na nuvem, e não mais no `localhost`.

1.  No seu código local, abra o arquivo `frontend/app.js` e `frontend/store.html` (ou onde estiver a constante `API_URL`).
2.  Altere a linha:
    ```javascript
    // Antes
    const API_URL = 'http://localhost:3000/api';
    
    // Depois (Exemplo, use a URL que copiou do Render)
    const API_URL = 'https://paytrack-api.onrender.com/api'; 
    ```
    *Dica Importante:* Para não quebrar seu ambiente local, você pode fazer algo dinâmico:
    ```javascript
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : 'https://paytrack-api.onrender.com/api';
    ```
3.  Faça o commit e push dessa alteração para o GitHub.

---

## Passo 5: Frontend no Netlify 🚀
O Netlify vai hospedar os arquivos HTML/CSS/JS.

1.  Crie uma conta no [Netlify](https://www.netlify.com/).
2.  Clique em **"Add new site"** -> **"Import an existing project"**.
3.  Conecte ao GitHub e selecione o repositório `PayTrack`.
4.  Configure:
    *   **Base directory:** `frontend` (Pois é onde estão os arquivos HTML).
    *   **Build command:** (Deixe em branco, é HTML puro).
    *   **Publish directory:** `frontend` (ou deixe em branco se já definiu o base directory).
5.  Clique em **Deploy**.
6.  O Netlify vai gerar um link (ex: `https://paytrack-carlos.netlify.app`).

## Resultado Final 🎉
*   **Admin:** Acesse `https://paytrack-carlos.netlify.app/index.html` (ou apenas o link raiz se renomear index.html).
*   **Loja:** Acesse `https://paytrack-carlos.netlify.app/store.html`.

Agora você tem um sistema profissional rodando na nuvem!
