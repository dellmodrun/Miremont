import './protocol-client.js';

const routes = {
  miremont: '/',
  Mechanism: '/mechanism/',
  Tasks: '/tasks/',
  Cursors: '/cursors/',
  Live: '/live/',
  Projects: '/projects/',
  'Build log': '/build-log/',
  Rewards: '/rewards/',
  Treasury: '/rewards/',
  Burning: '/mechanism/#burn',
  Verification: '/mechanism/#verify',
  Treasury: '/rewards/#vault',
  Docs: '/docs/',
  'Build receipts': '/build-log/',
  Status: '/build-log/',
  Developers: '/mechanism/#developers',
  'Read the protocol': '/mechanism/',
};

const external = {
  buy: 'https://pump.fun/',
  x: 'https://x.com/miremontrun',
};

const assetUrl = name => new URL(name, import.meta.url).href;

function ensureBrowserIcon() {
  let icon = document.querySelector('link[rel="icon"][data-miremont-icon]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.dataset.miremontIcon = 'true';
    document.head.append(icon);
  }
  icon.href = assetUrl('miremont-logo.png?v=3');
}

ensureBrowserIcon();

const walletProviders = [
  { name: 'Phantom', icon: assetUrl('wallet-phantom.svg'), get: () => window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null), url: 'https://phantom.com/' },
  { name: 'Solflare', icon: assetUrl('wallet-solflare.png'), get: () => window.solflare || null, url: 'https://solflare.com/' },
  { name: 'Backpack', icon: assetUrl('wallet-backpack.ico'), get: () => window.backpack?.solana || window.xnft?.solana || null, url: 'https://backpack.app/' },
];

let connectedAddress = localStorage.getItem('miremont_wallet') || '';

function shortAddress(address) {
  return address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'Connect wallet';
}

function updateWalletLabels() {
  const label = shortAddress(connectedAddress);
  document.querySelectorAll('.mm-wallet-button').forEach(button => { button.textContent = label; });
  document.querySelectorAll('.el-text').forEach(element => {
    if (element.dataset.mmWallet === 'true' || element.textContent.trim() === 'Connect wallet') {
      element.dataset.mmWallet = 'true';
      if (element.textContent !== label) element.textContent = label;
    }
  });
  document.querySelectorAll('[data-wallet-address]').forEach(element => {
    const value = connectedAddress || 'Not connected';
    if ('value' in element) {
      if (element.value !== value) element.value = value;
    } else if (element.textContent !== value) element.textContent = value;
  });
  document.querySelectorAll('[data-workspace-link]').forEach(link => {
    link.hidden = !connectedAddress;
  });
}

function ensureWalletModal() {
  let overlay = document.querySelector('.mm-wallet-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'mm-wallet-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="mm-wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
      <header class="mm-wallet-head"><h2 id="wallet-title">Connect a Solana wallet</h2><button class="mm-wallet-close mm-wallet-close-icon" type="button" aria-label="Close">×</button></header>
      <div class="mm-wallet-body">
        <p class="mm-wallet-note">Miremont only requests permission to read your public address. A transaction is signed only when you explicitly approve it.</p>
        <div class="mm-wallet-list"></div>
      </div>
      <footer class="mm-wallet-foot"><span data-modal-status>${connectedAddress ? `Connected: ${shortAddress(connectedAddress)}` : 'No wallet connected'}</span><div class="mm-wallet-foot-actions"><a class="mm-button" href="/account/" data-workspace-link ${connectedAddress ? '' : 'hidden'}>My workspace</a><button class="mm-wallet-close mm-disconnect" type="button">${connectedAddress ? 'Disconnect' : 'Close'}</button></div></footer>
    </section>`;
  document.body.append(overlay);
  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('.mm-wallet-close')) {
      if (event.target.closest('.mm-disconnect') && connectedAddress) disconnectWallet();
      overlay.hidden = true;
    }
  });
  return overlay;
}

function renderWalletOptions() {
  const overlay = ensureWalletModal();
  const list = overlay.querySelector('.mm-wallet-list');
  list.replaceChildren();
  for (const item of walletProviders) {
    const provider = item.get();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mm-wallet-option';
    button.innerHTML = `<span class="mm-wallet-option-main"><img src="${item.icon}" alt="" /><span>${item.name}</span></span><small>${provider ? 'Installed' : 'Install wallet'}</small>`;
    button.addEventListener('click', async () => {
      if (!provider) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
        return;
      }
      const status = overlay.querySelector('[data-modal-status]');
      status.textContent = `Connecting ${item.name}…`;
      try {
        const result = await provider.connect();
        const key = result?.publicKey || provider.publicKey;
        if (!key) throw new Error('Wallet did not return a public key.');
        connectedAddress = key.toString();
        window.miremontWalletProvider = provider;
        localStorage.setItem('miremont_wallet', connectedAddress);
        updateWalletLabels();
        if (window.MiremontProtocol) loadProtocolTables(window.MiremontProtocol);
        status.textContent = `Connected: ${shortAddress(connectedAddress)}`;
        setTimeout(() => { overlay.hidden = true; }, 450);
      } catch (error) {
        status.textContent = error?.message || 'Connection was cancelled.';
      }
    });
    list.append(button);
  }
  updateWalletLabels();
}

function openWallet() {
  const overlay = ensureWalletModal();
  renderWalletOptions();
  overlay.hidden = false;
  overlay.querySelector('.mm-wallet-close')?.focus();
}

async function disconnectWallet() {
  for (const item of walletProviders) {
    const provider = item.get();
    try { if (provider?.isConnected && provider.disconnect) await provider.disconnect(); } catch {}
  }
  connectedAddress = '';
  window.miremontWalletProvider = null;
  localStorage.removeItem('miremont_wallet');
  updateWalletLabels();
  if (window.MiremontProtocol) loadProtocolTables(window.MiremontProtocol);
}

function go(url, newTab = false) {
  if (newTab) window.open(url, '_blank', 'noopener,noreferrer');
  else window.location.href = url;
}

function runAction(action) {
    if (action === 'wallet') openWallet();
    else if (action === 'buy') go(external.buy, true);
    else if (action === 'x') go(external.x, true);
    else if (action === 'spawn') go('/cursors/#spawn');
    else if (action.startsWith('route:')) go(action.slice(6));
}

function makeAction(element, action) {
  if (!element) return;
  element.dataset.mmAction = action;
  element.classList.add('mm-clickable');
  element.setAttribute('role', action === 'wallet' ? 'button' : 'link');
  element.tabIndex = 0;
  if (element.dataset.mmBound) return;
  element.dataset.mmBound = 'true';
  element.addEventListener('click', event => { event.preventDefault(); runAction(element.dataset.mmAction || ''); });
  element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); runAction(element.dataset.mmAction || ''); } });
}

function clearAction(element) {
  if (!element?.dataset.mmBound) return;
  delete element.dataset.mmAction;
  element.classList.remove('mm-clickable');
  element.removeAttribute('role');
  element.removeAttribute('tabindex');
}

function near(value, expected) { return Math.abs(Number.parseFloat(value || '0') - expected) < 1; }

function bindHomeCanvas() {
  document.querySelectorAll('.el-text').forEach(element => {
    const text = element.textContent.trim();
    if (routes[text]) makeAction(element, `route:${routes[text]}`);
    else if (text === 'Connect wallet' || element.dataset.mmWallet === 'true') makeAction(element, 'wallet');
    else if (text === 'Buy $MIREMONT') makeAction(element, 'buy');
    else if (text === 'Spawn a Cursor') makeAction(element, 'spawn');
    else clearAction(element);
  });
  document.querySelectorAll('.el-rect').forEach(element => {
    const { left, top, width } = element.style;
    if (near(left, 1036) && near(top, 34) && near(width, 40)) makeAction(element, 'x');
    else if (near(left, 1084) && near(top, 34) && near(width, 104)) makeAction(element, 'wallet');
    else if (near(left, 116) && near(top, 488) && near(width, 184)) makeAction(element, 'buy');
    else if (near(left, 312) && near(top, 488) && near(width, 156)) makeAction(element, 'spawn');
    else if (near(left, 116) && near(top, 3596) && near(width, 184)) makeAction(element, 'spawn');
  });
  const navCanvas = document.querySelector('.nav-canvas');
  if (navCanvas && !navCanvas.querySelector('[data-home-x-link]')) {
    const link = document.createElement('a');
    link.className = 'mm-home-x-link';
    link.dataset.homeXLink = 'true';
    link.href = external.x;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Miremont on X');
    link.innerHTML = `<img src="${assetUrl('x-logo.svg')}" alt="" />`;
    navCanvas.append(link);
  }
  updateWalletLabels();
}

function bindSubpages() {
  document.querySelectorAll('.mm-wallet-button').forEach(button => button.addEventListener('click', openWallet));
  document.querySelectorAll('[data-x-link]').forEach(link => { link.href = external.x; });
  document.querySelectorAll('[data-buy-link]').forEach(link => { link.href = external.buy; });
  document.querySelectorAll('.mm-nav-links a').forEach(link => {
    if (new URL(link.href).pathname === window.location.pathname) link.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('[data-role]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-role]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const input = document.querySelector('[name="cursor_role"]');
    if (input) input.value = button.dataset.role;
  }));
  document.querySelectorAll('.mm-filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.mm-filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  bindProtocolActions();
  updateWalletLabels();
}

function activeWalletProvider() {
  if (window.miremontWalletProvider?.publicKey) return window.miremontWalletProvider;
  for (const item of walletProviders) {
    const provider = item.get();
    if (provider?.publicKey) {
      window.miremontWalletProvider = provider;
      return provider;
    }
  }
  return null;
}

function setProtocolMessage(message, state = '') {
  document.querySelectorAll('[data-protocol-message]').forEach(element => {
    element.textContent = message;
    element.dataset.state = state;
  });
}

function readableChainError(error, fallback = 'On-chain data is temporarily unavailable.') {
  const message = error?.message || String(error || '');
  if (/403|access forbidden/i.test(message)) {
    return 'The public Solana RPC refused this indexed request. Mainnet data access is being activated with the production RPC.';
  }
  if (/429|too many requests|rate.?limit/i.test(message)) {
    return 'The Solana RPC is temporarily rate-limited. Please try again shortly.';
  }
  return message || fallback;
}

const roleNames = ['Unassigned', 'Research', 'Code', 'Design', 'Review', 'Deploy'];
const accountText = value => value?.toBase58 ? value.toBase58() : value?.toString?.() || '—';
const enumName = value => value && typeof value === 'object' ? Object.keys(value)[0] || 'unknown' : String(value || 'unknown');
const utcTime = value => {
  const seconds = Number(value?.toString?.() || value || 0);
  return seconds > 0 ? new Date(seconds * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : '—';
};

async function inspectCursor(api, address) {
  const status = document.querySelector('[data-lookup-status]');
  if (!address) {
    if (status) status.textContent = 'Enter a Cursor account.';
    return;
  }
  if (status) status.textContent = 'Reading the Cursor account from Solana…';
  try {
    const cursor = await api.fetchCursor(address);
    const values = {
      address: cursor.address,
      owner: accountText(cursor.owner),
      role: roleNames[Number(cursor.role)] || `Role ${cursor.role}`,
      createdAt: utcTime(cursor.createdAt),
      status: enumName(cursor.status),
      project: accountText(cursor.project),
      task: accountText(cursor.task),
      outputHash: cursor.outputHash?.some(Number) ? `Output commitment · ${cursor.outputHash.map(value => value.toString(16).padStart(2, '0')).join('')}` : 'No output committed yet.',
      burnAmount: accountText(cursor.burnAmount),
      approvals: accountText(cursor.approvals),
      points: accountText(cursor.points),
      epochId: accountText(cursor.epochId),
      deadline: utcTime(cursor.deadline),
      reviewCount: accountText(cursor.reviewCount),
    };
    document.querySelectorAll('[data-cursor-field]').forEach(element => { element.textContent = values[element.dataset.cursorField] ?? '—'; });
    if (status) status.textContent = `Loaded ${shortAddress(address)} directly from the protocol account.`;
    const url = new URL(window.location.href);
    url.searchParams.set('address', address);
    history.replaceState(null, '', url);
  } catch (error) {
    if (status) status.textContent = readableChainError(error, 'Cursor account could not be decoded.');
  }
}

async function loadProtocolTables(api) {
  const taskBody = document.querySelector('[data-task-list]');
  if (taskBody) {
    try {
      const tasks = (await api.listTasks()).filter(task => task.open);
      document.querySelectorAll('[data-task-count]').forEach(element => { element.textContent = String(tasks.length); });
      taskBody.innerHTML = tasks.length ? tasks.map(task => `<tr><td><a href="/cursors/?task=${task.address}#spawn">${shortAddress(task.address)}</a></td><td>${shortAddress(accountText(task.project))}</td><td>${roleNames[Number(task.role)] || task.role}</td><td>${task.difficulty}</td><td>${task.basePoints}</td><td>${task.leaseSeconds}s</td><td>${task.cursorCount}/${task.maxCursors}</td></tr>`).join('') : '<tr><td class="mm-empty" colspan="7">No open on-chain tasks.</td></tr>';
    } catch (error) {
      taskBody.innerHTML = `<tr><td class="mm-empty" colspan="7">${readableChainError(error, 'Task accounts unavailable.')}</td></tr>`;
    }
  }
  const projectList = document.querySelector('[data-project-list]');
  if (projectList) {
    try {
      const projects = await api.listProjects();
      projectList.innerHTML = projects.length ? projects.map(project => `<article class="mm-project-card"><div class="mm-project-head"><div><small>Project ${project.id}</small><h3>${shortAddress(project.address)}</h3></div><span class="mm-status">${project.active ? 'Active' : 'Inactive'}</span></div><p>Authority · ${accountText(project.authority)}</p><div class="mm-grid-3"><div><strong>Artifact root</strong><span>${project.artifactRoot.slice(0, 6).map(value => value.toString(16).padStart(2, '0')).join('')}…</span></div><div><strong>Review policy</strong><span>${project.reviewPolicy.slice(0, 6).map(value => value.toString(16).padStart(2, '0')).join('')}…</span></div><div><strong>Account</strong><span>${project.address}</span></div></div><div class="mm-button-row"><a class="mm-button mm-button--primary" href="/tasks/">View tasks</a></div></article>`).join('') : '<article class="mm-project-card"><h3>No registered projects.</h3></article>';
    } catch (error) {
      projectList.innerHTML = `<article class="mm-project-card"><h3>${readableChainError(error, 'Project registry unavailable.')}</h3></article>`;
    }
  }
  const liveList = document.querySelector('[data-live-cursor-list]');
  const receiptBody = document.querySelector('[data-build-receipts]');
  if (liveList || receiptBody) {
    try {
      const cursors = await api.listCursors();
      document.querySelectorAll('[data-cursor-count]').forEach(element => { element.textContent = String(cursors.length); });
      if (liveList) liveList.innerHTML = cursors.length ? cursors.map(cursor => `<a class="mm-live-item" href="/cursor/?address=${cursor.address}"><strong>${shortAddress(cursor.address)}</strong><span>${enumName(cursor.status)} · ${roleNames[Number(cursor.role)] || cursor.role}</span></a>`).join('') : '<div class="mm-live-empty"><strong>No live Cursors.</strong><p>Spawn the first Cursor from an open task.</p></div>';
      if (receiptBody) receiptBody.innerHTML = cursors.length ? cursors.map(cursor => `<tr><td><a href="/cursor/?address=${cursor.address}">${shortAddress(cursor.address)}</a></td><td>${shortAddress(accountText(cursor.owner))}</td><td>${roleNames[Number(cursor.role)] || cursor.role}</td><td>${cursor.burnAmount}</td><td>${enumName(cursor.status)}</td><td>${cursor.points}</td><td>${cursor.epochId}</td></tr>`).join('') : '<tr><td class="mm-empty" colspan="7">No on-chain Cursor receipts.</td></tr>';
    } catch (error) {
      const message = readableChainError(error, 'Cursor accounts unavailable.');
      if (liveList) liveList.innerHTML = `<div class="mm-live-empty"><strong>${message}</strong></div>`;
      if (receiptBody) receiptBody.innerHTML = `<tr><td class="mm-empty" colspan="7">${message}</td></tr>`;
    }
  }
  if (document.querySelector('[data-treasury-address]')) {
    try {
      const treasury = await api.treasuryStatus();
      document.querySelectorAll('[data-treasury-address]').forEach(element => { element.textContent = shortAddress(treasury.treasury); });
      document.querySelectorAll('[data-epoch-count]').forEach(element => { element.textContent = String(treasury.epochs.length); });
      document.querySelectorAll('[data-treasury-value]').forEach(element => {
        element.textContent = accountText(treasury.account[element.dataset.treasuryValue]);
      });
    } catch (error) {
      document.querySelectorAll('[data-treasury-address]').forEach(element => { element.textContent = readableChainError(error, 'unavailable'); });
    }
  }
  const accountBody = document.querySelector('[data-account-cursors]');
  if (accountBody) {
    if (!connectedAddress) {
      accountBody.innerHTML = '<tr><td class="mm-empty" colspan="7">Connect a wallet to load its Cursors.</td></tr>';
    } else {
      try {
        const cursors = (await api.listCursors()).filter(cursor => accountText(cursor.owner) === connectedAddress);
        const finalized = cursors.filter(cursor => enumName(cursor.status) === 'finalized');
        const active = cursors.filter(cursor => ['active', 'submitted', 'pendingChallenge', 'challenged'].includes(enumName(cursor.status)));
        const metrics = { active: active.length, finalized: finalized.length, points: cursors.reduce((sum, cursor) => sum + Number(cursor.points.toString()), 0), total: cursors.length };
        document.querySelectorAll('[data-account-metric]').forEach(element => { element.textContent = String(metrics[element.dataset.accountMetric] ?? 0); });
        accountBody.innerHTML = cursors.length ? cursors.map(cursor => `<tr><td><a href="/cursor/?address=${cursor.address}">${shortAddress(cursor.address)}</a></td><td>${shortAddress(accountText(cursor.project))}</td><td>${shortAddress(accountText(cursor.task))}</td><td>${roleNames[Number(cursor.role)] || cursor.role}</td><td>${enumName(cursor.status)}</td><td>${utcTime(cursor.deadline)}</td><td>${cursor.points}</td></tr>`).join('') : '<tr><td class="mm-empty" colspan="7">No Cursors owned by this wallet.</td></tr>';
      } catch (error) {
        accountBody.innerHTML = `<tr><td class="mm-empty" colspan="7">${readableChainError(error, 'Wallet accounts unavailable.')}</td></tr>`;
      }
    }
  }
}

function bindProtocolActions() {
  const api = window.MiremontProtocol;
  if (!api) return;
  document.querySelectorAll('[data-local-only]').forEach(element => { element.hidden = !api.isLocal; });
  const selectedTask = new URLSearchParams(location.search).get('task');
  document.querySelectorAll('[name="task_account"]').forEach(input => {
    if (selectedTask) input.value = selectedTask;
    else if (!api.isLocal) input.value = '';
  });
  document.querySelectorAll('[data-cursor-lookup]').forEach(form => {
    if (form.dataset.mmBound) return;
    form.dataset.mmBound = 'true';
    form.addEventListener('submit', event => {
      event.preventDefault();
      inspectCursor(api, new FormData(form).get('cursor')?.toString().trim());
    });
    const address = new URLSearchParams(location.search).get('address');
    if (address) {
      form.elements.cursor.value = address;
      inspectCursor(api, address);
    }
  });
  document.querySelectorAll('[data-cursor-action-form]').forEach(form => {
    if (form.dataset.mmBound) return;
    form.dataset.mmBound = 'true';
    const address = new URLSearchParams(location.search).get('address');
    if (address) form.elements.cursor.value = address;
    form.querySelectorAll('[data-cursor-action]').forEach(button => button.addEventListener('click', async () => {
      const provider = activeWalletProvider();
      if (!provider?.publicKey) return openWallet();
      const values = Object.fromEntries(new FormData(form));
      const cursor = values.cursor?.trim();
      const evidence = values.evidence?.trim();
      const action = button.dataset.cursorAction;
      const status = form.querySelector('[data-cursor-action-status]');
      if (!cursor) {
        status.textContent = 'Enter a Cursor account first.';
        return;
      }
      if (['submit', 'review', 'challenge'].includes(action) && !evidence) {
        status.textContent = 'Output or evidence is required for this action.';
        return;
      }
      button.disabled = true;
      status.textContent = `Preparing ${action} transaction…`;
      try {
        let result;
        if (action === 'submit') result = await api.submitBuild(provider, cursor, evidence);
        else if (action === 'review') result = await api.reviewBuild(provider, cursor, values.approve === 'true', values.quality, evidence);
        else if (action === 'challenge') result = await api.challengeBuild(provider, cursor, evidence);
        else if (action === 'dismiss') result = await api.resolveChallenge(provider, cursor, false);
        else if (action === 'uphold') result = await api.resolveChallenge(provider, cursor, true);
        else if (action === 'finalize') result = await api.finalizeBuild(provider, cursor);
        else if (action === 'claim') result = await api.claimBuilderReward(provider, cursor);
        status.textContent = `${action} confirmed · ${shortAddress(result.signature)}`;
        await inspectCursor(api, cursor);
      } catch (error) {
        status.textContent = error?.message || `${action} failed.`;
      } finally {
        button.disabled = false;
      }
    }));
  });
  document.querySelectorAll('[data-register-project-form]').forEach(form => {
    if (form.dataset.mmBound) return;
    form.dataset.mmBound = 'true';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const provider = activeWalletProvider();
      if (!provider?.publicKey) return openWallet();
      const values = Object.fromEntries(new FormData(form));
      const status = form.querySelector('[data-project-form-status]');
      status.textContent = 'Review and sign the project registration…';
      try {
        const result = await api.registerProject(provider, values.artifactRoot, values.reviewPolicy);
        status.textContent = `Project registered · ${result.project}`;
      } catch (error) { status.textContent = error?.message || 'Project registration failed.'; }
    });
  });
  document.querySelectorAll('[data-publish-task-form]').forEach(form => {
    if (form.dataset.mmBound) return;
    form.dataset.mmBound = 'true';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const provider = activeWalletProvider();
      if (!provider?.publicKey) return openWallet();
      const values = Object.fromEntries(new FormData(form));
      const status = form.querySelector('[data-task-form-status]');
      status.textContent = 'Review and sign the task contract…';
      try {
        const result = await api.publishTask(provider, values);
        status.textContent = `Task published · ${result.task}`;
        await loadProtocolTables(api);
      } catch (error) { status.textContent = error?.message || 'Task publication failed.'; }
    });
  });
  document.querySelectorAll('[data-treasury-form]').forEach(form => {
    if (form.dataset.mmBound) return;
    form.dataset.mmBound = 'true';
    form.querySelectorAll('[data-treasury-action]').forEach(button => button.addEventListener('click', async () => {
      const provider = activeWalletProvider();
      if (!provider?.publicKey) return openWallet();
      const values = Object.fromEntries(new FormData(form));
      const action = button.dataset.treasuryAction;
      const status = form.querySelector('[data-treasury-status]');
      button.disabled = true;
      status.textContent = `Preparing ${action} transaction…`;
      try {
        let result;
        if (action === 'deposit') result = await api.depositFees(provider, values.solAmount);
        else if (action === 'settle') result = await api.settleEpoch(provider, values.epochId);
        else if (action === 'claim') result = await api.claimBuilderReward(provider, values.cursor);
        status.textContent = `${action} confirmed · ${shortAddress(result.signature)}`;
        await loadProtocolTables(api);
      } catch (error) {
        status.textContent = error?.message || `${action} failed.`;
      } finally {
        button.disabled = false;
      }
    }));
  });
  document.querySelectorAll('[data-demo-fund]').forEach(button => {
    if (button.dataset.mmBound) return;
    button.dataset.mmBound = 'true';
    button.addEventListener('click', async () => {
      const provider = activeWalletProvider();
      if (!provider?.publicKey) return openWallet();
      button.disabled = true;
      setProtocolMessage('Funding the connected wallet on localnet…');
      try {
        const result = await api.fundLocalDemo(provider.publicKey.toString());
        setProtocolMessage(`Demo wallet ready · ${result.sol} SOL · ${result.tokens} test tokens`, 'ok');
      } catch (error) {
        setProtocolMessage(error?.message || 'Demo funding failed.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll('[data-spawn-form]').forEach(form => {
    if (form.dataset.mmBound) return;
    form.dataset.mmBound = 'true';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const provider = activeWalletProvider();
      if (!provider?.publicKey) return openWallet();
      const submit = form.querySelector('[data-spawn-submit]');
      const task = new FormData(form).get('task_account')?.toString().trim();
      submit.disabled = true;
      setProtocolMessage('Preparing the burn transaction. Review it in your wallet…');
      try {
        const result = await api.spawnCursor(provider, task);
        setProtocolMessage(`Cursor created · ${result.cursor} · burn ${result.burnAmount} base units`, 'ok');
        const link = form.querySelector('[data-cursor-result]');
        if (link) {
          link.href = `/cursor/?address=${encodeURIComponent(result.cursor)}`;
          link.textContent = 'Open Cursor receipt';
          link.hidden = false;
        }
      } catch (error) {
        setProtocolMessage(error?.message || 'The transaction failed.', 'error');
      } finally {
        submit.disabled = false;
      }
    });
  });
  if (!document.documentElement.dataset.protocolChecked) {
    document.documentElement.dataset.protocolChecked = 'true';
    api.protocolStatus().then(status => {
      document.querySelectorAll('[data-protocol-network]').forEach(element => { element.textContent = status.network; });
      document.querySelectorAll('[data-protocol-mint]').forEach(element => {
        const value = status.mint || 'TBA';
        if ('value' in element) element.value = value;
        else element.textContent = value;
      });
      if (status.ready) setProtocolMessage(`Protocol ready · program ${shortAddress(status.program)} · task ${shortAddress(status.task)}`, 'ok');
      else setProtocolMessage(status.reason, 'pending');
    }).catch(error => setProtocolMessage(error?.message || 'Protocol status could not be loaded.', 'error'));
    loadProtocolTables(api);
  }
}

if (document.querySelector('#root')) {
  const observer = new MutationObserver(bindHomeCanvas);
  observer.observe(document.querySelector('#root'), { childList: true, subtree: true });
  bindHomeCanvas();
} else {
  bindSubpages();
}

window.addEventListener('storage', updateWalletLabels);
