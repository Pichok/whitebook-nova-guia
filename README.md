# Whitebook — Abrir Conteúdos em Nova Guia

Userscript para **Tampermonkey** que habilita a abertura de tópicos, bulas, calculadoras, cards de categoria e listas de subcategorias do **Whitebook Web** (`whitebook.pebmed.com.br`) em novas guias do navegador, mantendo a página original intacta (sem recarregar, fechar acordeões ou perder a posição de rolagem).

* **Documentação e Guia Completo:** [pichok.github.io/projects/whitebook-nova-guia](https://pichok.github.io/projects/whitebook-nova-guia)
* **Instalação Direta (1 Clique):** [Instalar Userscript via Raw](https://raw.githubusercontent.com/Pichok/whitebook-nova-guia/main/whitebook-nova-guia.user.js)

---

## 🎯 Objetivo

Por ser construído como uma *Single Page Application* (SPA) moderna em React/Next.js, o Whitebook Web não utiliza tags de link HTML tradicionais (`<a href="...">`) na maior parte de sua interface — os cards de especialidades são elementos `<button>` e os itens das listas de conteúdo são elementos `<div>` controlados por eventos internos do React.

Isso impede o uso de atalhos nativos dos navegadores (como `Ctrl + Clique` ou o clique com o botão do meio/scroll do mouse) para abrir múltiplas condutas, protocolos ou bulas em paralelo durante o plantão ou estudo. Este script intercepta a camada de roteamento da aplicação e devolve esse comportamento nativo ao navegador.

---

## ✨ Funcionalidades

* **Suporte Universal aos Elementos do Whitebook:** Funciona tanto em links tradicionais (`<a>`) quanto nos cards de categoria (`<button>`) e nos itens das listas de doenças/fármacos (`<div>`).
* **Atalhos Nativos:** Suporte completo a **`Ctrl + Clique`** (ou `Cmd + Clique` no macOS) e **Clique com o Botão do Meio (Scroll)** do mouse.
* **Preservação Total do Estado da Aba Principal:** Ao abrir um item em nova guia, a aba atual não pisca, não recarrega e não fecha menus/acordeões abertos (como *Formulações* ou *Categorias*).
* **Controle de Foco Configurável:** Permite escolher se a nova guia abre em segundo plano (padrão) ou se o navegador alterna o foco imediatamente para ela.
* **Modo de Abertura Contínua (Opcional):** Opção para fazer com que *qualquer* clique simples já abra o conteúdo em uma nova guia.
* **Atualizações Automáticas:** Integrado ao sistema de versionamento do Tampermonkey via GitHub Raw.

---

## 🚀 Como Instalar

### Pré-requisitos
Instale a extensão **Tampermonkey** no seu navegador:
* [Tampermonkey para Google Chrome / Brave / Edge](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
* [Tampermonkey para Mozilla Firefox](https://addons.mozilla.org/pt-BR/firefox/addon/tampermonkey/)

### Instalação Automática (Recomendada)
1. Clique no link direto do script: **[Instalar whitebook-nova-guia.user.js](https://raw.githubusercontent.com/Pichok/whitebook-nova-guia/main/whitebook-nova-guia.user.js)**.
2. O Tampermonkey abrirá automaticamente uma tela de confirmação exibindo o código e os metadados do projeto.
3. Clique no botão **Instalar**.
4. Acesse ou recarregue a página do [Whitebook Web](https://whitebook.pebmed.com.br/).

---

## ⚙️ Configurações Personalizáveis

No início do código do script, existem duas constantes que você pode alterar conforme sua preferência de uso:

```javascript
const FORCAR_SEMPRE_NOVA_GUIA = false;
const FOCAR_NOVA_ABA = false;
```

| Variável | Valor `false` (Padrão) | Valor `true` |
| :--- | :--- | :--- |
| **`FORCAR_SEMPRE_NOVA_GUIA`** | Abre em nova guia apenas ao usar `Ctrl + Clique` ou `Botão do Meio`. Clique normal navega na mesma guia. | Qualquer clique simples em tópicos ou cards abre automaticamente em uma nova guia. |
| **`FOCAR_NOVA_ABA`** | Abre a nova guia em segundo plano (ao lado da atual), mantendo você na lista de pesquisa. | Alterna o foco do navegador imediatamente para a nova guia aberta. |

> **Nota sobre atualizações:** Se você editar manualmente essas variáveis no painel do Tampermonkey, a extensão pausará as atualizações automáticas daquele arquivo para não sobrescrever suas preferências locais.

---

## 🛠️ Arquitetura Técnica (Como Foi Criado)

Para contornar as limitações de roteamento SPA sem quebrar a árvore de componentes do React, o script opera em quatro camadas de interceptação executadas em `@run-at document-start`:

1. **Captura de Eventos de Ponteiro (`pointerdown` e `auxclick`):** Detecta modificadores (`Ctrl`/`Meta`) e cliques com o botão central do mouse (`button === 1`). Como elementos `<div>` e `<button>` não disparam eventos de navegação no clique do meio por padrão, o script sintetiza um evento `click` controlado (`isSimulatingClick`) para que o manipulador interno do React revele a rota de destino.
2. **Interceptação de Âncoras (`<a>`):** Bloqueia a propagação padrão em links HTML tradicionais e delega a abertura para `GM_openInTab`.
3. **Interceptação da History API e Navigation API (`unsafeWindow`):** Sobrescreve `history.pushState`, `history.replaceState` e escuta o evento `navigate` da *Navigation API* moderna. Quando uma mudança de rota (`pathname`) ocorre dentro da janela de `2500ms` após um clique válido, a URL de destino é capturada e aberta via `GM_openInTab` (permitindo o controle fino da propriedade `active` para o foco da aba).
4. **Aborto Síncrono da Transição Local:** Para evitar que o Next.js/React desmonte a página original ou resete estados locais (como acordeões abertos) após capturar a URL, o interceptador lança uma exceção controlada (`__WB_NEWTAB_ABORT__`) dentro do `pushState` e a silencia nos listeners globais (`error` e `unhandledrejection`). Isso interrompe a renderização da nova rota na aba de origem antes que qualquer alteração visual ocorra.

---

## 🔄 Como Funciona o Versionamento e Atualização

Este repositório utiliza o fluxo nativo de atualização de userscripts:

* **Metadados no Cabeçalho:** As diretivas `@updateURL` e `@downloadURL` apontam diretamente para o arquivo hospedado na branch `main` (`https://raw.githubusercontent.com/Pichok/whitebook-nova-guia/main/whitebook-nova-guia.user.js`).
* **Verificação Automática:** Periodicamente, o Tampermonkey consulta o cabeçalho `@version` do arquivo remoto. Sempre que uma nova versão for publicada no repositório (ex: de `1.6` para `1.7`), a extensão baixa e aplica a atualização automaticamente em segundo plano, sem que o usuário precise reinstalar nada.
* **Verificação Manual:** O usuário pode forçar a checagem a qualquer momento clicando no ícone do Tampermonkey na barra do navegador e selecionando **"Verificar atualizações de userscripts"**.

---

## 📄 Licença

Distribuído sob a licença MIT. Desenvolvido por [Guilherme H. M. Pichok](https://github.com/Pichok).