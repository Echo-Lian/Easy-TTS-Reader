/**
 * Easy TTS Reader for Zotero
 * Bootstrap script for plugin initialization
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");

let EasyTTS = {
  id: 'easytts@zotero',
  version: '1.0.0',
  rootURI: '',
  ttsService: null,

  async startup({ id, version, resourceURI, rootURI }) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;

    // Load TTS service
    await this.loadTTSService();

    // Add menu items
    this.addMenuItems();

    // Register context menu
    this.registerContextMenu();

    // Add toolbar button
    this.addToolbarButton();

    Zotero.debug(`Easy TTS Reader ${version} started`);
  },

  async shutdown() {
    // Clean up menu items
    this.removeMenuItems();

    // Remove toolbar button
    this.removeToolbarButton();

    Zotero.debug('Easy TTS Reader shutdown');
  },

  async install() {
    Zotero.debug('Easy TTS Reader installed');
  },

  async uninstall() {
    // Clean up preferences
    const prefs = Zotero.Prefs.getAll();
    Object.keys(prefs).forEach(key => {
      if (key.startsWith('extensions.easytts.')) {
        Zotero.Prefs.clear(key);
      }
    });

    Zotero.debug('Easy TTS Reader uninstalled');
  },

  async loadTTSService() {
    // Load shared TTS service
    Services.scriptloader.loadSubScript(this.rootURI + 'shared/tts-service.js', this);
    Services.scriptloader.loadSubScript(this.rootURI + 'shared/storage-adapter.js', this);
  },

  addMenuItems() {
    const menubar = Zotero.getMainWindow().document.getElementById('main-menubar');
    if (!menubar) return;

    // Create Tools menu item
    const toolsMenu = Zotero.getMainWindow().document.getElementById('menu_ToolsPopup');
    if (toolsMenu) {
      const menuSeparator = Zotero.getMainWindow().document.createXULElement('menuseparator');
      menuSeparator.id = 'easytts-menu-separator';
      toolsMenu.appendChild(menuSeparator);

      const menuItem = Zotero.getMainWindow().document.createXULElement('menuitem');
      menuItem.id = 'easytts-menu-item';
      menuItem.setAttribute('label', 'Easy TTS Reader');
      menuItem.setAttribute('oncommand', 'EasyTTS.openWindow()');
      toolsMenu.appendChild(menuItem);
    }
  },

  removeMenuItems() {
    const menuItem = Zotero.getMainWindow().document.getElementById('easytts-menu-item');
    if (menuItem) menuItem.remove();

    const separator = Zotero.getMainWindow().document.getElementById('easytts-menu-separator');
    if (separator) separator.remove();
  },

  registerContextMenu() {
    // Add context menu for reading item abstracts
    Zotero.getMainWindow().document.addEventListener('popupshowing', (event) => {
      if (event.target.id === 'zotero-itemmenu') {
        this.addContextMenuItems(event.target);
      }
    });
  },

  addContextMenuItems(menu) {
    // Remove existing items
    const existingItems = menu.querySelectorAll('[id^="easytts-context-"]');
    existingItems.forEach(item => item.remove());

    // Add new items
    const separator = Zotero.getMainWindow().document.createXULElement('menuseparator');
    separator.id = 'easytts-context-separator';
    menu.appendChild(separator);

    const readAbstract = Zotero.getMainWindow().document.createXULElement('menuitem');
    readAbstract.id = 'easytts-context-read-abstract';
    readAbstract.setAttribute('label', 'Read Abstract with TTS');
    readAbstract.setAttribute('oncommand', 'EasyTTS.readSelectedItemAbstract()');
    menu.appendChild(readAbstract);

    const readNotes = Zotero.getMainWindow().document.createXULElement('menuitem');
    readNotes.id = 'easytts-context-read-notes';
    readNotes.setAttribute('label', 'Read Notes with TTS');
    readNotes.setAttribute('oncommand', 'EasyTTS.readSelectedItemNotes()');
    menu.appendChild(readNotes);
  },

  addToolbarButton() {
    const toolbar = Zotero.getMainWindow().document.getElementById('zotero-toolbar');
    if (!toolbar) return;

    const button = Zotero.getMainWindow().document.createXULElement('toolbarbutton');
    button.id = 'easytts-toolbar-button';
    button.setAttribute('label', 'TTS Reader');
    button.setAttribute('tooltiptext', 'Open Easy TTS Reader');
    button.setAttribute('oncommand', 'EasyTTS.openWindow()');
    button.setAttribute('class', 'zotero-tb-button');

    toolbar.appendChild(button);
  },

  removeToolbarButton() {
    const button = Zotero.getMainWindow().document.getElementById('easytts-toolbar-button');
    if (button) button.remove();
  },

  openWindow() {
    const windowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
      .getService(Ci.nsIWindowMediator);

    let win = windowMediator.getMostRecentWindow('easytts:reader');

    if (win) {
      win.focus();
    } else {
      const features = 'chrome,centerscreen,resizable,width=500,height=600';
      win = Zotero.getMainWindow().openDialog(
        this.rootURI + 'content/reader.xhtml',
        'easytts:reader',
        features
      );
    }
  },

  async readSelectedItemAbstract() {
    const items = Zotero.getActiveZoteroPane().getSelectedItems();
    if (!items || items.length === 0) {
      Zotero.alert('Please select an item first');
      return;
    }

    const item = items[0];
    const abstract = item.getField('abstractNote');

    if (!abstract) {
      Zotero.alert('No abstract found for selected item');
      return;
    }

    await this.speakText(abstract);
  },

  async readSelectedItemNotes() {
    const items = Zotero.getActiveZoteroPane().getSelectedItems();
    if (!items || items.length === 0) {
      Zotero.alert('Please select an item first');
      return;
    }

    const item = items[0];
    const notes = item.getNotes();

    if (!notes || notes.length === 0) {
      Zotero.alert('No notes found for selected item');
      return;
    }

    // Combine all notes
    let allNotesText = '';
    for (const noteID of notes) {
      const note = Zotero.Items.get(noteID);
      const noteHTML = note.getNote();
      // Strip HTML tags
      const noteText = noteHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      allNotesText += noteText + '\n\n';
    }

    await this.speakText(allNotesText);
  },

  async speakText(text) {
    // This would integrate with the TTS service
    // For now, just show the text in a dialog
    Zotero.alert(`Speaking: ${text.substring(0, 100)}...`);

    // In a real implementation, you would:
    // 1. Get preferences from storage
    // 2. Call TTS service
    // 3. Handle audio playback
  }
};

// Bootstrap functions called by Zotero
function startup(data, reason) {
  return EasyTTS.startup(data);
}

function shutdown(data, reason) {
  return EasyTTS.shutdown();
}

function install(data, reason) {
  return EasyTTS.install();
}

function uninstall(data, reason) {
  return EasyTTS.uninstall();
}

// Make EasyTTS available globally
if (typeof window !== 'undefined') {
  window.EasyTTS = EasyTTS;
}
