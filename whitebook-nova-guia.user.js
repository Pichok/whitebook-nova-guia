// ==UserScript==
// @name         Whitebook - Abrir Conteúdos em Nova Guia
// @namespace    https://pichok.github.io/projects/whitebook-nova-guia
// @version      1.6
// @description  Abre links, cards (<button>) e itens (<div>) do Whitebook em nova guia com controle de foco e sem alterar a aba atual
// @author       Guilherme H. M. Pichok
// @homepageURL  https://pichok.github.io/projects/whitebook-nova-guia
// @supportURL   https://github.com/Pichok/whitebook-nova-guia/issues
// @updateURL    https://raw.githubusercontent.com/Pichok/whitebook-nova-guia/main/whitebook-nova-guia.user.js
// @downloadURL  https://raw.githubusercontent.com/Pichok/whitebook-nova-guia/main/whitebook-nova-guia.user.js
// @match        https://whitebook.pebmed.com.br/*
// @grant        GM_openInTab
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const FORCAR_SEMPRE_NOVA_GUIA = false;
    const FOCAR_NOVA_ABA = false; // true = muda o foco para a nova aba | false = mantém o foco na aba principal (segundo plano)

    const ABORT_MSG = '__WB_NEWTAB_ABORT__';
    const winObj = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    let modifierPressed = false;
    let lastUserClickTime = 0;
    let isSimulatingClick = false;

    function abrirAba(url) {
        if (typeof GM_openInTab === 'function') {
            GM_openInTab(url, { active: FOCAR_NOVA_ABA, insert: true, setParent: true });
        } else {
            const win = window.open(url, '_blank', 'noopener,noreferrer');
            if (!FOCAR_NOVA_ABA && win) {
                win.blur();
                window.focus();
            }
        }
    }

    // Silencia o erro proposital usado para abortar a renderização do React na aba atual
    winObj.addEventListener('error', (e) => {
        if (e.message && e.message.includes(ABORT_MSG)) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);

    winObj.addEventListener('unhandledrejection', (e) => {
        if (e.reason && String(e.reason).includes(ABORT_MSG)) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);

    function isValidNavigationTarget(target) {
        if (target.closest('[data-accordion-trigger], input, textarea, select, [role="tab"], [role="switch"], [data-no-newtab]')) {
            return false;
        }
        const btn = target.closest('button');
        if (btn && (!btn.innerText || btn.innerText.trim().length === 0)) {
            return false;
        }
        return true;
    }

    // 1. Monitora pointerdown
    document.addEventListener('pointerdown', (e) => {
        if (isSimulatingClick) return;

        if (!isValidNavigationTarget(e.target)) {
            lastUserClickTime = 0;
            modifierPressed = false;
            return;
        }

        const isMiddleClick = e.button === 1;
        const isCtrlClick = e.button === 0 && (e.ctrlKey || e.metaKey);

        if (FORCAR_SEMPRE_NOVA_GUIA || isMiddleClick || isCtrlClick) {
            lastUserClickTime = Date.now();
            modifierPressed = true;
        } else {
            lastUserClickTime = 0;
            modifierPressed = false;
        }
    }, true);

    // 2. Suporte ao Botão do Meio (scroll) em <div> e <button>
    document.addEventListener('auxclick', (e) => {
        if (e.button !== 1) return;
        if (!isValidNavigationTarget(e.target)) return;
        if (e.target.closest('a[href]')) return;

        e.preventDefault();
        e.stopPropagation();

        lastUserClickTime = Date.now();
        modifierPressed = true;

        isSimulatingClick = true;
        e.target.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: winObj
        }));
        isSimulatingClick = false;
    }, true);

    // 3. Intercepta links <a> tradicionais
    document.addEventListener('click', (e) => {
        if (isSimulatingClick) return;

        const anchor = e.target.closest('a');
        if (!anchor || !anchor.href) return;

        const url = new URL(anchor.href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash) {
            return;
        }

        if (FORCAR_SEMPRE_NOVA_GUIA || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            abrirAba(anchor.href);
        }
    }, true);

    // Abre a nova aba e aborta a transição de rota antes do React desmontar a tela atual
    function interceptAndAbort(targetUrl) {
        const isRecentClick = (Date.now() - lastUserClickTime) < 2500;
        const shouldOpenNewTab = isRecentClick && (FORCAR_SEMPRE_NOVA_GUIA || modifierPressed);

        if (!shouldOpenNewTab || !targetUrl) return false;

        try {
            const parsedTarget = new URL(targetUrl, window.location.origin);
            if (parsedTarget.pathname !== window.location.pathname) {
                lastUserClickTime = 0;
                modifierPressed = false;

                abrirAba(parsedTarget.href);
                return true;
            }
        } catch (err) {
            return false;
        }
        return false;
    }

    // 4. Intercepta pushState e replaceState na janela principal (unsafeWindow)
    const originalPushState = winObj.history.pushState;
    winObj.history.pushState = function(state, title, url) {
        if (interceptAndAbort(url)) {
            throw new Error(ABORT_MSG);
        }
        return originalPushState.apply(this, arguments);
    };

    const originalReplaceState = winObj.history.replaceState;
    winObj.history.replaceState = function(state, title, url) {
        if (interceptAndAbort(url)) {
            throw new Error(ABORT_MSG);
        }
        return originalReplaceState.apply(this, arguments);
    };

    // 5. Intercepta Navigation API moderna (Chrome/Edge)
    if (winObj.navigation) {
        winObj.navigation.addEventListener('navigate', (e) => {
            if (!e.canIntercept || e.hashChange) return;
            if (interceptAndAbort(e.destination.url)) {
                e.preventDefault();
            }
        });
    }
})();