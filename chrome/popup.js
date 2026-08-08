const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const storageSession = typeof browser !== 'undefined' ? browser.storage.session : chrome.storage.session;
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

let headers = [];
let pendingDeleteKey = null;
let domains = [];
let pendingDeleteType = null;
let editingKey = null;
let encryptedProjects = [];
let currentPassphrase = null;
class Modal {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    this.focusableElements = [];
    this.firstFocusableElement = null;
    this.lastFocusableElement = null;
    this.triggeringElement = null;
    this.resolve = null;
    this.onConfirm = this.onConfirm.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  show({ labelledById = null, describedById = null } = {}) {
    this.triggeringElement = document.activeElement;

    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    if (labelledById) this.modal.setAttribute('aria-labelledby', labelledById);
    if (describedById) this.modal.setAttribute('aria-describedby', describedById);

    this.modal.style.display = 'flex';

    const focusable = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    this.focusableElements = Array.from(focusable);
    this.firstFocusableElement = this.focusableElements[0];
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];

    return new Promise(resolve => {
      this.resolve = resolve;
    });
  }

  hide() {
    this.modal.removeAttribute('role');
    this.modal.removeAttribute('aria-modal');
    this.modal.removeAttribute('aria-labelledby');
    this.modal.removeAttribute('aria-describedby');
    this.modal.style.display = 'none';
    this.cleanup();
    if (this.triggeringElement) {
      this.triggeringElement.focus();
    }
  }

  onCancel() {
    this.hide();
    if (this.resolve) this.resolve(null);
  }

  onKeydown(e) {
    const isTabPressed = e.key === 'Tab';

    if (e.key === 'Escape') {
      this.onCancel();
      return;
    }

    if (isTabPressed) {
      if (e.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          this.lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === this.lastFocusableElement) {
          this.firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    }
  }
}

class PasswordModal extends Modal {
  constructor() {
    super('password-modal');
    this.titleEl = document.getElementById('password-title');
    this.msgEl = document.getElementById('password-message');
    this.nameInput = document.getElementById('project-name-input');
    this.input = document.getElementById('password-input');
    this.inputConfirm = document.getElementById('password-confirm-input');
    this.btnConfirm = document.getElementById('password-confirm');
    this.btnCancel = document.getElementById('password-cancel');
  }

  async show({ title = 'Senha', message = 'Insira a senha', mode = 'unlock', validationFn = null, includeProjectName = false, initialProjectName = '' } = {}) {
    this.titleEl.textContent = title;
    this.msgEl.textContent = message;
    this.nameInput.value = initialProjectName;
    this.nameInput.style.display = includeProjectName ? 'block' : 'none';
    this.input.value = '';
    this.inputConfirm.value = '';
    this.input.type = 'password';
    this.inputConfirm.style.display = mode === 'set' ? 'block' : 'none';
    this.mode = mode;
    this.includeProjectName = includeProjectName;
    this.validationFn = validationFn;

    this.btnConfirm.addEventListener('click', this.onConfirm);
    this.btnCancel.addEventListener('click', this.onCancel);
    this.modal.addEventListener('keydown', this.onKeydown);
    
    super.show({ labelledById: 'password-title', describedById: 'password-message' });
    if (this.includeProjectName) {
      this.nameInput.focus();
    } else {
      this.input.focus();
    }
    return new Promise(resolve => { this.resolve = resolve; });
  }

  cleanup() {
    this.btnConfirm.removeEventListener('click', this.onConfirm);
    this.btnCancel.removeEventListener('click', this.onCancel);
    this.modal.removeEventListener('keydown', this.onKeydown);
  }

  onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.onConfirm();
      return;
    }

    super.onKeydown(e);
  }

  async onConfirm() {
    const pass = this.input.value;
    if (!pass) return;

    if (this.includeProjectName) {
      const projectName = this.nameInput.value.trim();
      if (!projectName) {
        this.msgEl.textContent = 'Informe um nome para o projeto.';
        this.msgEl.className = 'alert-message message-danger';
        this.msgEl.style.display = 'block';
        this.nameInput.focus();
        return;
      }
    }

    if (this.mode === 'set' && pass !== this.inputConfirm.value) {
      this.msgEl.textContent = 'As senhas não coincidem. Tente novamente.';
      this.msgEl.className = 'alert-message message-danger';
      this.msgEl.style.display = 'block';
      this.input.focus();
      return;
    }

    if (this.validationFn) {
      const isValid = await this.validationFn(pass);
      if (isValid) {
        this.hide();
        if (this.resolve) {
          this.resolve(this.includeProjectName ? { projectName: this.nameInput.value.trim(), passphrase: pass } : pass);
        }
      } else {
        this.msgEl.textContent = 'Senha incorreta. Tente novamente.';
        this.msgEl.className = 'alert-message message-danger';
        this.msgEl.style.display = 'block';
        this.input.value = '';
        this.input.focus();
      }
    } else {
      this.msgEl.className = 'alert-message';
      this.msgEl.style.display = 'none';
      this.hide();
      if (this.resolve) {
        this.resolve(this.includeProjectName ? { projectName: this.nameInput.value.trim(), passphrase: pass } : pass);
      }
    }
  }
}

class ConfirmModal extends Modal {
  constructor(modalId, titleId, messageId, confirmId, cancelId) {
    super(modalId);
    this.titleEl = document.getElementById(titleId);
    this.msgEl = document.getElementById(messageId);
    this.btnConfirm = document.getElementById(confirmId);
    this.btnCancel = document.getElementById(cancelId);
  }

  show({ title = 'Confirmação', message = 'Deseja continuar?' } = {}) {
    this.titleEl.textContent = title;
    this.msgEl.textContent = message;
    this.btnConfirm.addEventListener('click', this.onConfirm);
    this.btnCancel.addEventListener('click', this.onCancel);
    return super.show({ labelledById: titleId, describedById: messageId });
  }

  cleanup() {
    this.btnConfirm.removeEventListener('click', this.onConfirm);
    this.btnCancel.removeEventListener('click', this.onCancel);
  }

  onConfirm() {
    this.hide();
    if (this.resolve) this.resolve(true);
  }
}

class AlertModal extends Modal {
  constructor(modalId, titleId, messageId, okId) {
    super(modalId);
    this.titleEl = document.getElementById(titleId);
    this.msgEl = document.getElementById(messageId);
    this.btnOk = document.getElementById(okId);
  }

  show({ title = 'Aviso', message = '' } = {}) {
    this.titleEl.textContent = title;
    this.msgEl.textContent = message;
    this.btnOk.addEventListener('click', this.onConfirm);
    this.modal.addEventListener('keydown', this.onKeydown);
    super.show({ labelledById: 'alert-title', describedById: 'alert-message' });
    this.btnOk.focus();
    return new Promise(resolve => { this.resolve = resolve; });
  }

  cleanup() {
    this.btnOk.removeEventListener('click', this.onConfirm);
    this.modal.removeEventListener('keydown', this.onKeydown);
  }

  onConfirm() {
    this.hide();
    if (this.resolve) this.resolve(true);
  }

  onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Enter') {
      this.onConfirm();
    }
  }
}

class InputModal extends Modal {
    constructor() {
        super('password-modal');
        this.titleEl = document.getElementById('password-title');
        this.msgEl = document.getElementById('password-message');
        this.input = document.getElementById('password-input');
        this.inputConfirm = document.getElementById('password-confirm-input');
        this.btnConfirm = document.getElementById('password-confirm');
        this.btnCancel = document.getElementById('password-cancel');
    }

    show({ title = 'Entrada', message = 'Forneça um valor:', initialValue = '' } = {}) {
        this.titleEl.textContent = title;
        this.msgEl.textContent = message;
        this.input.type = 'text';
        this.input.value = initialValue;
        this.inputConfirm.style.display = 'none';

        this.btnConfirm.addEventListener('click', this.onConfirm);
        this.btnCancel.addEventListener('click', this.onCancel);
        this.modal.addEventListener('keydown', this.onKeydown);

        super.show({ labelledById: 'password-title', describedById: 'password-message' });
        this.input.focus();
        return new Promise(resolve => { this.resolve = resolve; });
    }

    cleanup() {
        this.btnConfirm.removeEventListener('click', this.onConfirm);
        this.btnCancel.removeEventListener('click', this.onCancel);
        this.modal.removeEventListener('keydown', this.onKeydown);
        this.input.type = 'password';
    }

    onConfirm() {
        const value = this.input.value.trim();
        if (value) {
            this.hide();
            if (this.resolve) this.resolve(value);
        }
    }
}

class ImportModal extends Modal {
    constructor() {
        super('import-modal');
        this.btnConfirm = document.getElementById('import-confirm');
        this.btnCancel = document.getElementById('import-cancel');
        this.backdrop = this.modal.querySelector('.modal-backdrop');
        this.textarea = document.getElementById('import-json-content');
    }

    show() {
        this.textarea.value = '';
        this.btnConfirm.addEventListener('click', this.onConfirm);
        this.btnCancel.addEventListener('click', this.onCancel);
        this.backdrop.addEventListener('click', this.onCancel);
        super.show({ labelledById: 'import-title' });
        this.textarea.focus();
        return new Promise(resolve => { this.resolve = resolve; });
    }

    cleanup() {
        this.btnConfirm.removeEventListener('click', this.onConfirm);
        this.btnCancel.removeEventListener('click', this.onCancel);
        this.backdrop.removeEventListener('click', this.onCancel);
    }

    onConfirm() {
        const content = this.textarea.value;
        this.hide();
        if (this.resolve) this.resolve(content);
    }
}

class DomainFilterModal extends Modal {
    constructor() {
        super('domain-filter-modal');
        this.input = document.getElementById('domain-input');
        this.addBtn = document.getElementById('add-domain-btn');
        this.list = document.getElementById('domain-list');
        this.saveBtn = document.getElementById('domain-filter-save');
        this.cancelBtn = document.getElementById('domain-filter-cancel');
        this.alertMessage = document.getElementById('domain-alert-message');
        this.tempDomains = [];

        this.addBtn.addEventListener('click', async () => await this.addDomain());
        this.input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await this.addDomain();
            }
        });
        this.input.addEventListener('input', () => this.hideMessage());
    }

    show(currentDomains = []) {
        this.tempDomains = [...currentDomains];
        this.renderDomainList();
        this.hideMessage();
        this.saveBtn.addEventListener('click', this.onConfirm);
        this.cancelBtn.addEventListener('click', this.onCancel);
        this.modal.addEventListener('keydown', this.onKeydown);
        super.show({ labelledById: 'domain-filter-title' });
        this.input.focus();
        return new Promise(resolve => { this.resolve = resolve; });
    }
    showMessage(message, type = 'info') {
      this.alertMessage.className = `alert-message message-${type}`;
      this.alertMessage.textContent = message;
      this.alertMessage.style.display = 'block';
    }

    hideMessage() {
      this.alertMessage.className = 'alert-message';
      this.alertMessage.textContent = '';
      this.alertMessage.style.display = 'none';
    }

    cleanup() {
        this.saveBtn.removeEventListener('click', this.onConfirm);
        this.cancelBtn.removeEventListener('click', this.onCancel);
        this.modal.removeEventListener('keydown', this.onKeydown);
    }

    async onConfirm() {
        const domain = this.input.value.trim();
        if (domain) {
            const added = await this.addDomain();
            if (!added) {
                return;
            }
        }
        updateDomainFilterButtonState();
        this.hide();
        if (this.resolve) this.resolve(this.tempDomains.filter(d => d));
    }

    async addDomain() {
        const domain = this.input.value.trim().toLowerCase();
        const pattern = /^(<all_urls>|\*:\/\/[^\/]+\/\*|https?:\/\/[^\/]+\/\*)$/;

        if (!domain) return false;

        if (!pattern.test(domain)) {
            this.showMessage('Formato de domínio inválido. Use um padrão como "*://site.com/*".', 'danger');
            return false;
        }

        if (domain && !this.tempDomains.includes(domain)) {
            this.hideMessage();
            this.tempDomains.push(domain);
            this.renderDomainList();
            this.input.value = '';
        }
        this.input.focus();
        return true;
    }

    renderDomainList() {
        this.list.innerHTML = '';
        if (this.tempDomains.length === 0) {
            this.list.style.display = 'none';
            return;
        }
        this.list.style.display = 'block';
        this.tempDomains.forEach((domain, index) => {
            const li = document.createElement('li');

            const span = document.createElement('span');
            span.textContent = domain;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'delete-button';
            button.textContent = '🗑';
            button.addEventListener('click', () => {
                this.tempDomains.splice(index, 1);
                this.renderDomainList();
            });
            li.appendChild(span);
            li.appendChild(button);
            this.list.appendChild(li);
        });
        this.list.scrollTop = this.list.scrollHeight;
    }
}

const passwordModal = new PasswordModal();
const inputModal = new InputModal();
const importModal = new ImportModal();
const alertModal = new AlertModal('alert-modal', 'alert-title', 'alert-message', 'alert-ok');
const domainFilterModal = new DomainFilterModal();

const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

async function loadTheme() {
  const result = await storage.local.get('theme');
  const theme = result.theme || 'light';
  applyTheme(theme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  } else {
    html.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
  }
}

themeToggle.addEventListener('click', async () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  await storage.local.set({ theme: newTheme });
  applyTheme(newTheme);
});

loadTheme();

const projectSelect = document.getElementById('project-select');
const newProjectInput = document.getElementById('new-project');
const createProjectBtn = document.getElementById('create-project');
const cancelCreateBtn = document.getElementById('cancel-create-project');
const deleteProjectBtn = document.getElementById('delete-project');
const exportProjectBtn = document.getElementById('export-project');
const importProjectBtn = document.getElementById('import-project');
const domainFilterBtn = document.getElementById('domain-filter-btn');
const unlockProjectBtn = document.getElementById('unlock-project-btn');
cancelCreateBtn.style.display = 'none';


let projects = {};

function hasValidProjectSelection() {
  const selectedValue = projectSelect?.value || '';
  if (!selectedValue) return false;
  return selectedValue !== 'Adicione um projeto para começar' && selectedValue !== '-- Selecione um projeto --';
}

function updateDomainFilterButtonState() {
  if (!domainFilterBtn) return;

  const shouldPulse = !!currentProject && Array.isArray(domains) && domains.length === 0;
  domainFilterBtn.classList.toggle('domain-filter-empty', shouldPulse);
}

async function loadProjects() {
  const localData = await storage.local.get(['projects', 'encryptedProjects', 'currentProject']);
  projects = localData.projects || {};
  encryptedProjects = localData.encryptedProjects || [];
  currentProject = localData.currentProject || null;
  
  const sessionData = await storageSession.get(['unlockedProject', 'unlockedData', 'unlockedPassphrase']);

  updateProjectSelect(sessionData.unlockedProject);

  if (currentProject) {
    projectSelect.value = currentProject;
    if (sessionData.unlockedProject === currentProject) {
      const data = sessionData.unlockedData || { headers: [], domains: [] };
      headers = data.headers || [];
      domains = data.domains || [];
      currentPassphrase = sessionData.unlockedPassphrase;
      renderList();
      showMessage(`Projeto "${currentProject}" carregado.`);
      clearFormInputs();
      exportProjectBtn.style.display = 'inline-block';
      domainFilterBtn.style.display = 'inline-block';
      updateDomainFilterButtonState();
      setHeaderFormVisible(true);
    } else if (encryptedProjects.includes(currentProject)) {
      setHeaderFormVisible(false);
      exportProjectBtn.style.display = 'none';
      domainFilterBtn.style.display = 'none';
      updateDomainFilterButtonState();
      headers = [];
      domains = [];
      renderList();
    } else if (projects[currentProject]) {
      headers = projects[currentProject] || [];
      renderList();
      clearFormInputs();
      exportProjectBtn.style.display = 'inline-block';
      setHeaderFormVisible(true);
      domainFilterBtn.style.display = 'inline-block';
      updateDomainFilterButtonState();
    }
  } else {
    exportProjectBtn.style.display = 'none';
    setHeaderFormVisible(false);
    domainFilterBtn.style.display = 'none';
    updateDomainFilterButtonState();
  }
}

function updateProjectSelect(unlockedProjectName) {
  const names = new Set(Object.keys(projects || {}));
  (encryptedProjects || []).forEach(n => names.add(n));

  projectSelect.replaceChildren();

  const placeholderOption = document.createElement('option');
  placeholderOption.textContent = names.size === 0
    ? 'Adicione um projeto para começar'
    : '-- Selecione um projeto --';
  placeholderOption.value = '';

  projectSelect.appendChild(placeholderOption);

  Array.from(names).sort().forEach(projectName => {
    const option = document.createElement('option');
    option.value = projectName;
    const isEncrypted = encryptedProjects.includes(projectName);
    const isUnlocked = projectName === unlockedProjectName;
    option.textContent = projectName + (isEncrypted && !isUnlocked ? ' (🔒)' : '');
    projectSelect.appendChild(option);
  });

  if (currentProject && names.has(currentProject)) {
    projectSelect.value = currentProject;
  } else {
    projectSelect.value = '';
  }
}

projectSelect.addEventListener('change', async (e) => {
  const selectedProject = e.target.value;

  const sessionData = await storageSession.get('unlockedProject');
  if (sessionData.unlockedProject !== selectedProject) {
    await storageSession.clear();
    currentPassphrase = null;
    updateProjectSelect(null);
  }
  if (!selectedProject) {
    if (currentProject && encryptedProjects.includes(currentProject)) {
      unlockProjectBtn.dataset.projectToUnlock = currentProject;
    }
    setHeaderFormVisible(false);
    currentProject = null
    await storage.local.set({ currentProject: null });
    headers = [];
    domains = [];
    renderList();
    updateDomainFilterButtonState();
    showMessage('Selecione um projeto para começar.');
    return;
  }

  currentProject = selectedProject;
  await storage.local.set({ currentProject });

  if (encryptedProjects.includes(currentProject)) {
    const pass = await passwordModal.show({
      title: 'Desbloquear projeto',
      message: `Informe a senha para desbloquear o projeto "${currentProject}":`,
      mode: 'unlock',
      validationFn: async (passphrase) => {
        return new Promise(resolve => {
          runtime.sendMessage({ action: 'loadDecryptedProject', name: currentProject, passphrase }, async resp => {
            if (resp && resp.ok) {
              headers = resp.data.headers || [];
              domains = resp.data.domains || [];
              currentPassphrase = passphrase;
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });
      }
    });

    if (pass) {
      await storageSession.set({
        unlockedProject: currentProject,
        unlockedData: { headers, domains },
        unlockedPassphrase: currentPassphrase
      });
      updateProjectSelect(currentProject);
      renderList();
      showMessage(`Projeto "${currentProject}" carregado.`);
      clearFormInputs();
      updateDomainFilterButtonState();
      setHeaderFormVisible(true);
    } else {
      //TODO fix selected project
      projectSelect.value = '';
      currentProject = null;
      await storage.local.set({ currentProject: null });
      showMessage('Projeto criptografado. Operação cancelada.', 'warning');
      setHeaderFormVisible(false);
      headers = [];
      domains = [];
      updateDomainFilterButtonState();
      renderList();
    }
  } else {
    headers = projects[currentProject] || [];
    renderList();
    showMessage(`Projeto "${currentProject}" carregado.`);
    clearFormInputs();
    updateDomainFilterButtonState();
    setHeaderFormVisible(true);
  }
});

function showDeleteProjectConfirm(projectName) {
  confirmTitle.textContent = 'Atenção!';
  confirmMessage.textContent = `Tem certeza que deseja remover o projeto ${projectName}? Esta ação não pode ser desfeita e todos os headers serão perdidos.`;
  pendingDeleteKey = projectName;
  pendingDeleteType = 'project';
  modal.style.display = 'flex';
}

function resetCreateProjectUi() {
  newProjectInput.classList.remove('visible');
  newProjectInput.value = '';
  createProjectBtn.textContent = 'Criar';
  cancelCreateBtn.style.display = 'none';
  projectSelect.style.display = 'inline-block';
  importProjectBtn.style.display = 'inline-block';
  const projectSelected = hasValidProjectSelection();
  exportProjectBtn.style.display = projectSelected ? 'inline-block' : 'none';
  domainFilterBtn.style.display = projectSelected ? 'inline-block' : 'none';
  deleteProjectBtn.style.display = projectSelected ? 'inline-block' : 'none';

  const isEncryptedAndLocked = projectSelected && currentProject && encryptedProjects.includes(currentProject) && form.classList.contains('hidden');
  unlockProjectBtn.style.display = isEncryptedAndLocked ? 'inline-block' : 'none';
}

cancelCreateBtn.addEventListener('click', () => {
  passwordModal.hide();
  resetCreateProjectUi();
});

createProjectBtn.addEventListener('click', async () => {
  const result = await passwordModal.show({
    title: 'Criar projeto',
    message: 'Informe o nome do projeto, a senha e confirme a senha para criar o projeto.',
    mode: 'set',
    includeProjectName: true,
    initialProjectName: ''
  });

  if (!result) {
    showMessage('Criação de projeto cancelada.', 'warning');
    resetCreateProjectUi();
    return;
  }

  const { projectName, passphrase } = result;

  if (!projectName) {
    showMessage('Digite um nome para o projeto.', 'warning');
    return;
  }

  const allProjectNames = new Set([...Object.keys(projects), ...encryptedProjects]);
  if (allProjectNames.has(projectName)) {
    showMessage('Projeto já existe. Escolha outro nome.', 'danger');
    return;
  }

  runtime.sendMessage({ action: 'saveEncryptedProject', name: projectName, data: { headers: [], domains: [] }, passphrase }, async resp => {
    if (resp && resp.ok) {
      encryptedProjects.push(projectName);
      await storage.local.set({ encryptedProjects });
      currentPassphrase = passphrase;
      currentProject = projectName;
      await storage.local.set({ currentProject });
      headers = [];
      domains = [];

      await storageSession.set({
        unlockedProject: currentProject,
        unlockedData: { headers, domains },
        unlockedPassphrase: currentPassphrase
      });

      updateProjectSelect(projectName);
      projectSelect.value = projectName;
      renderList();
      showMessage('Projeto criado e criptografado com sucesso.');
      resetCreateProjectUi();
      updateDomainFilterButtonState();
      setHeaderFormVisible(true);
    } else {
      showMessage('Falha ao criptografar o projeto.', 'danger');
    }
  });
});

exportProjectBtn.addEventListener('click', async () => {
  if (!currentProject) {
    showMessage('Selecione um projeto para exportar.', 'warning');
    return;
  }

  let projectHeaders = headers;
  let projectDomains = domains;

  if (encryptedProjects.includes(currentProject)) {
    const pass = await passwordModal.show({
      title: 'Confirmar Senha',
      message: `Para exportar, confirme a senha do projeto "${currentProject}":`,
      mode: 'unlock',
      validationFn: async (passphrase) => {
        return new Promise(resolve => {
          runtime.sendMessage({ action: 'loadDecryptedProject', name: currentProject, passphrase }, (resp) => {
            if (resp && resp.ok) {
              projectHeaders = resp.data.headers;
              projectDomains = resp.data.domains;
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });
      }
    });

    if (!pass) {
      showMessage('Senha incorreta ou operação cancelada. A exportação foi cancelada.', 'warning');
      return;
    }
  }

  const data = {
    project: currentProject,
    exportedAt: new Date().toISOString(),
    headers: projectHeaders,
    domains: projectDomains || [],
  };
  exportFile(`${currentProject}_headers.json`, data);
  showMessage('Projeto exportado com sucesso.');
});

importProjectBtn.addEventListener('click', async () => {
  const jsonContent = await importModal.show();

  if (!jsonContent) {
    showMessage('Importação cancelada.', 'warning');
    return;
  }

  try {
    const data = JSON.parse(jsonContent);
    const importedHeaders = data.headers || (Array.isArray(data) ? data : []);
    const importedDomains = data.domains || [];
    const isRawArray = Array.isArray(data);

    if (Array.isArray(importedHeaders)) {
      await handleImportedData({ headers: importedHeaders, domains: importedDomains });
    } else if (isRawArray) {
      await handleImportedHeaders(data);
    } else {
      throw new Error('Formato de arquivo JSON inválido ou não reconhecido.');
    }
  } catch (error) {
    showMessage(`Erro ao importar. Verifique a estrutura do arquivo JSON.`, 'danger');
  }
});

async function handleImportedData(importedData) {
  const allProjectNames = new Set([...Object.keys(projects), ...encryptedProjects]);

  const projectName = await inputModal.show({
    title: 'Nome do Projeto Importado',
    message: 'Escolha um nome para o novo projeto importado:',
    initialValue: 'projeto-importado'
  });

  if (!projectName) {
    showMessage('Importação cancelada pelo usuário.', 'warning');
    return;
  }

  if (allProjectNames.has(projectName)) {
    showMessage(`O nome "${projectName}" já existe. Importação abortada.`, 'danger');
    return;
  }

  const pass = await passwordModal.show({
    title: 'Criptografar Projeto Importado',
    message: `Defina uma senha para armazenar o novo projeto "${projectName}":`,
    mode: 'set'
  });

  if (!pass) {
    showMessage('Senha não definida. A importação foi cancelada.', 'warning');
    return;
  }

  runtime.sendMessage({ action: 'saveEncryptedProject', name: projectName, data: importedData, passphrase: pass }, async (resp) => {
    try {
      if (resp && resp.ok) {
        encryptedProjects.push(projectName);
        await storage.local.set({ encryptedProjects });

        currentPassphrase = pass;
        currentProject = projectName;
        headers = importedData.headers;
        domains = importedData.domains;
        
        await storage.local.set({ currentProject });
        await storageSession.set({
          unlockedProject: currentProject,
          unlockedData: { headers, domains },
          unlockedPassphrase: currentPassphrase
        });
        
        updateProjectSelect(projectName);
        projectSelect.value = projectName;
        renderList();
        clearFormInputs();
        setHeaderFormVisible(true);
        showMessage(`Projeto "${projectName}" importado e criptografado com sucesso!`);
      } else {
        throw new Error(resp.error || 'A API retornou uma resposta inesperada.');
      }
    } catch (error) {
      showMessage(`Falha ao processar a importação: ${error.message}`, 'danger');
    }
  });
}

deleteProjectBtn.addEventListener('click', () => {
  if (!currentProject) {
    showMessage('Nenhum projeto selecionado para remover.', 'warning');
    return;
  }
  showDeleteProjectConfirm(currentProject);
});

domainFilterBtn.addEventListener('click', async () => {
  if (!currentProject) {
    showMessage('Nenhum projeto selecionado.', 'warning');
    return;
  }

  const newDomains = await domainFilterModal.show(domains);

  if (newDomains) {
    domains = newDomains;
    updateDomainFilterButtonState();
    runtime.sendMessage({ action: 'saveEncryptedProject', name: currentProject, data: { headers, domains }, passphrase: currentPassphrase }, async (resp) => {
      if (resp && resp.ok) {
        await storageSession.set({ unlockedData: { headers, domains } });
        await runtime.sendMessage({ action: 'checkPermissions' });
      }
    });
    showMessage('Filtro de domínios atualizado.');
  }
});

loadProjects();

const messageEl = document.getElementById('message');
const keyInput = document.getElementById('header-key');
const valueInput = document.getElementById('header-value');
const form = document.getElementById('header-form');
const listContainer = document.getElementById('headers-list');
const emptyState = document.getElementById('empty-state');

const modal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmDelete = document.getElementById('confirm-delete');

function clearFormInputs() {
  keyInput.value = '';
  valueInput.value = '';
  keyInput.readOnly = false;
  keyInput.style.opacity = '1';
  editingKey = null;
  updateFormState();
}

function setHeaderFormVisible(visible) {
  if (!form) return;
  if (visible) {
    form.classList.remove('hidden');
    const projectSelected = hasValidProjectSelection();
    exportProjectBtn.style.display = projectSelected ? 'inline-block' : 'none';
    domainFilterBtn.style.display = projectSelected ? 'inline-block' : 'none';
    deleteProjectBtn.style.display = projectSelected ? 'inline-block' : 'none';
    unlockProjectBtn.style.display = 'none';
    updateDomainFilterButtonState();
  } else {
    form.classList.add('hidden');
    exportProjectBtn.style.display = 'none';
    domainFilterBtn.style.display = 'none';
    deleteProjectBtn.style.display = 'none';
    unlockProjectBtn.style.display = (hasValidProjectSelection() && currentProject && encryptedProjects.includes(currentProject)) ? 'inline-block' : 'none';
    updateDomainFilterButtonState();
  }
}

let messageTimeout = null;

function showMessage(text, type = 'info') {
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }

  messageEl.innerHTML = '';
  messageEl.className = `message message-${type}`;

  if (typeof text === 'string') {
    messageEl.textContent = text;
  } else {
    messageEl.appendChild(text);
  }
  messageEl.className = `message message-${type} visible`;
  if (type != 'info-pwd-locked') {
      messageTimeout = setTimeout(() => {
        messageEl.className = `message`;
        messageEl.textContent = '';
        messageEl.classList.remove('visible');
        messageTimeout = null;
      }, 5000);
  }
}

function showDeleteConfirm(headerKey) {
  pendingDeleteKey = headerKey;
  pendingDeleteType = 'header';
  confirmMessage.textContent = `Tem certeza que deseja excluir o cabeçalho "${headerKey}"? Esta ação não pode ser desfeita.`;
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
  pendingDeleteKey = null;
  pendingDeleteType = null;
}

confirmCancel.addEventListener('click', closeModal);

modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

confirmDelete.addEventListener('click', async () => {
  if (!pendingDeleteKey) return;

  if (pendingDeleteType === 'project') {
    const projectToDelete = pendingDeleteKey;
    if (encryptedProjects.includes(projectToDelete)) {
      await storage.local.remove([`project_encrypted_${projectToDelete}`]);
      encryptedProjects = encryptedProjects.filter(p => p !== projectToDelete);
      await storage.local.set({ encryptedProjects });
    }

    const sessionData = await storageSession.get('unlockedProject');
    if (sessionData.unlockedProject === projectToDelete) {
      await storageSession.clear();
    }

    currentProject = null;
    headers = [];
    domains = [];
    await storage.local.set({ currentProject: null });
    updateProjectSelect(null);
    projectSelect.value = '';
    renderList();
    showMessage('Projeto removido com sucesso.');
    setHeaderFormVisible(false);
  } else if (pendingDeleteType === 'header') {
    headers = headers.filter(item => item.key !== pendingDeleteKey);
    runtime.sendMessage({ action: 'saveEncryptedProject', name: currentProject, data: { headers, domains }, passphrase: currentPassphrase }, async resp => {
      if (resp && resp.ok) {
        await storageSession.set({ unlockedData: { headers, domains } });
        renderList();
        showMessage('Header removido.');
        if (editingKey) {
          cancelEdit();
        }
      } else {
        showMessage('Erro ao salvar projeto.', 'danger');
      }
    });
  }
  closeModal();
});

storage.onChanged.addListener(async (changes) => {
  if (changes.theme) {
    applyTheme(changes.theme.newValue || 'light');
  }
  if (changes.encryptedProjects || changes.projects) {
    encryptedProjects = changes.encryptedProjects.newValue || [];
    const sessionData = await storageSession.get('unlockedProject');
    updateProjectSelect(sessionData.unlockedProject);
  }
});


function renderList() {
  listContainer.innerHTML = '';
  if (headers.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  const headerRow = document.createElement('div');
  headerRow.className = 'list-header';

  const headerColumn = document.createElement('div');
  headerColumn.className = 'list-item-column';
  const headerLabel = document.createElement('span');
  headerLabel.className = 'list-item-label';
  headerLabel.textContent = 'Header';
  headerColumn.appendChild(headerLabel);

  const valueColumn = document.createElement('div');
  valueColumn.className = 'list-item-column';
  const valueLabel = document.createElement('span');
  valueLabel.className = 'list-item-label';
  valueLabel.textContent = 'Valor';
  valueColumn.appendChild(valueLabel);

  const actionsColumn = document.createElement('div');
  actionsColumn.className = 'list-actions';

  headerRow.appendChild(headerColumn);
  headerRow.appendChild(valueColumn);
  headerRow.appendChild(actionsColumn);
  listContainer.appendChild(headerRow);

  headers.forEach(header => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.dataset.key = header.key;

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = '🖋';
    editButton.className = 'edit-button';
    editButton.addEventListener('click', () => {
      startEdit(header.key, header.value);
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '🗑';
    deleteButton.className = 'delete-button';
    deleteButton.addEventListener('click', () => {
      showDeleteConfirm(header.key);
    });

    const actions = document.createElement('div');
    actions.className = 'list-actions';
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    const keyColumn = document.createElement('div');
    keyColumn.className = 'list-item-column';
    const keySpan = document.createElement('span');
    keySpan.textContent = header.key;
    keyColumn.appendChild(keySpan);

    const valueColumn = document.createElement('div');
    valueColumn.className = 'list-item-column';
    const valueSpan = document.createElement('span');
    valueSpan.textContent = header.value;
    valueColumn.appendChild(valueSpan);

    row.appendChild(keyColumn);
    row.appendChild(valueColumn);

    row.appendChild(actions);
    listContainer.appendChild(row);
  });
}

function startEdit(key, value) {
  if (editingKey) {
    cancelEdit();
  }

  editingKey = key;
  keyInput.value = key;
  valueInput.value = value;
  keyInput.readOnly = true;
  keyInput.style.opacity = '0.6';
  valueInput.focus();
  showMessage('Editando. Pressione "Salvar" para confirmar ou "Cancelar" para descartar.');
  updateFormState();

  const row = document.querySelector(`.list-item[data-key="${CSS.escape(key)}"]`);
  if (row) {
    row.querySelector('.edit-button').style.display = 'none';
    row.querySelector('.delete-button').style.display = 'none';
  }
}

function cancelEdit() {
  if (editingKey) {
    const row = document.querySelector(`.list-item[data-key="${CSS.escape(editingKey)}"]`);
    if (row) {
      row.querySelector('.edit-button').style.display = 'inline-block';
      row.querySelector('.delete-button').style.display = 'inline-block';
    }
  }
  clearFormInputs();
}

function updateFormState() {
  const submitBtn = document.getElementById('add-header');
  const cancelBtn = document.getElementById('cancel-header');
  if (editingKey) {
    submitBtn.textContent = 'Salvar';
    cancelBtn.style.display = 'inline-block';
  } else {
    submitBtn.textContent = 'Adicionar';
    cancelBtn.style.display = 'none';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (!currentProject) {
    showMessage('Selecione um projeto primeiro.', 'warning');
    return;
  }

  const key = keyInput.value.trim();
  const value = valueInput.value.trim();

  if (!key) {
    showMessage('Por favor, informe uma chave válida.', 'warning');
    return;
  }

  if (editingKey) {
    const index = headers.findIndex(h => h.key === editingKey);
    if (index !== -1) {
      headers[index].value = value;
      runtime.sendMessage({ action: 'saveEncryptedProject', name: currentProject, data: { headers, domains }, passphrase: currentPassphrase }, async resp => {
        if (resp && resp.ok) {
          await storageSession.set({ unlockedData: { headers, domains } });
          showMessage('Header atualizado.');
          renderList();
          cancelEdit();
        } else {
          showMessage('Erro ao salvar projeto.', 'danger');
        }
      });
    }
  } else {
    const exists = headers.some(header => header.key.toLowerCase() === key.toLowerCase());
    if (exists) {
      showMessage('A chave já existe. Edite, escolha outro nome ou remova a existente', 'danger');
      return;
    }

    headers.push({ key, value });
    runtime.sendMessage({ action: 'saveEncryptedProject', name: currentProject, data: { headers, domains }, passphrase: currentPassphrase }, async resp => {
      if (resp && resp.ok) {
        await storageSession.set({ unlockedData: { headers, domains } });
        showMessage('Header adicionado.');
        clearFormInputs();
        renderList();
      } else {
        showMessage('Erro ao salvar projeto.', 'danger');
      }
    });
  }
});

document.getElementById('cancel-header').addEventListener('click', cancelEdit);

unlockProjectBtn.addEventListener('click', () => {
  const projectToUnlock = unlockProjectBtn.dataset.projectToUnlock;

  if (projectToUnlock && encryptedProjects.includes(projectToUnlock)) {
    projectSelect.value = projectToUnlock;
    projectSelect.dispatchEvent(new Event('change'));
    delete unlockProjectBtn.dataset.projectToUnlock;
    return;
  }

  if (currentProject && encryptedProjects.includes(currentProject)) {
    projectSelect.dispatchEvent(new Event('change'));
  } else {
    delete unlockProjectBtn.dataset.projectToUnlock;
    showMessage('Nenhum projeto criptografado selecionado para desbloquear.', 'warning');
  }
});
