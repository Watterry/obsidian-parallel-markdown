import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting,
	     WorkspaceLeaf, TFile, SplitDirection } from 'obsidian';

// Remember to rename these classes and interfaces!

declare module "obsidian" {
	interface View {
		file: TFile;
	}
	interface WorkspaceLeaf {
		id: string;
	}
}

interface ParallelMarkdownSettings {
	mySetting: string;
	DIRECTION: SplitDirection;
	CLOSE_OTHER: boolean;
}

// interface ParallelMarkdownSettings {
// 	DIRECTION: SplitDirection;
// 	CLOSE_OTHER: boolean;
// }

const DEFAULT_SETTINGS: ParallelMarkdownSettings = {
	mySetting: 'default',
	DIRECTION: 'vertical',
	CLOSE_OTHER: true
}

export default class ParalleMarkdownPlugin extends Plugin {
	settings: ParallelMarkdownSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});

		this.addCommand({
			id: "translate-and-sync",
			name: "Translate and sync Selection to right side",
			editorCallback: (editor: Editor) => {
			  const selectedText = editor.getSelection();
	  
			  const onSubmit = (text: string, url: string) => {
				editor.replaceSelection(`[${text}](${url})`);
			  };
	  
			  //new InsertLinkModal(this.app, selectedText, onSubmit).open();
			},
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});


		this.app.workspace.onLayoutReady(() => {

			//this.addSettingTab(new SplitViewPluginSettingsTab(this.app, this));

			// const ribbonIconEl = this.addRibbonIcon('vertical-split', 'Open Split View', (evt: MouseEvent) => {
			// 	this.openSplitPaneView();
			// });
			//ribbonIconEl.addClass('split-view-plugin-ribbon-class');

			// this.addCommand({
			// 	id: 'open-split-view',
			// 	name: 'Open Split View',
			// 	checkCallback: (checking: boolean) => {
			// 		if (getMarkdownLeaves()) {
			// 			if (!checking) {
			// 				this.openSplitPaneView();
			// 			}
			// 			return true;
			// 		}
			// 	}
			// });

			this.openSplitPaneView();

			// this.addCommand({
			// 	id: 'close-other-leaves',
			// 	name: 'Close Other Leaves',
			// 	checkCallback: (checking: boolean) => {
			// 		if (getMarkdownLeaves()) {
			// 			if (!checking) {
			// 				const mrl = this.getMostRecentMDLeaf();
			// 				if (mrl) {
			// 					this.closeOtherLeaves(mrl.id);
			// 				} else {
			// 					new Notice('Could not determine which pane(s) to close.');
			// 				}
			// 			}
			// 			return true;
			// 		}
			// 	}
			// });
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		console.log('loading parallel markdown plugin finished.')
	} // end of on load

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getMostRecentMDLeaf(): WorkspaceLeaf | null {
		const mrl = this.app.workspace.getMostRecentLeaf();
		if (mrl && mrl.view.getViewType() === 'markdown') {
			return mrl;
		} else {
			return null;
		}
	}



	async openSplitPaneView() {
		const srcLeaf: WorkspaceLeaf | null = this.getMostRecentMDLeaf();
		const srcView = <MarkdownView>srcLeaf?.view ?? null;

		const srcFile = <TFile>srcLeaf?.view.file ?? null;
		if (!srcFile) {
			new Notice('Could not determine active file!');
			return;
		}

		// if (this.settings.CLOSE_OTHER) { //close empty & non-primary leaves
		// 	this.closeOtherLeaves(srcLeaf.id);
		// }

		// choose parallel files
		const files = await this.app.vault.getMarkdownFiles();
		const selectedCN = files.filter(file => file.name === "witte-cn.md")[0];
		const selectedEN = files.filter(file => file.name === "witte-en.md")[0];

		//const newLeaf = this.app.workspace.createLeafBySplit(srcLeaf, this.settings.DIRECTION, false);
		const newLeaf = this.app.workspace.getLeaf('split', this.settings.DIRECTION); // open a split window
		console.log('selected file is: ', selectedCN.name)
		await newLeaf.openFile(selectedCN, { state: { mode: 'source', active: true, focus: false } });
		this.app.workspace.setActiveLeaf(newLeaf);

		// if (srcView.getMode() === 'preview') {
		// 	await srcView.setState({
		// 		...srcView.getState(),
		// 		mode: 'source'
		// 	}, result: ViewStateResult);
		// }
		//srcLeaf.setGroupMember(newLeaf);

		await srcLeaf.openFile(selectedEN, { state: { mode: 'source', active: true, focus: false } });
		this.app.workspace.setActiveLeaf(srcLeaf);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ParalleMarkdownPlugin;

	constructor(app: App, plugin: ParalleMarkdownPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Google Translate API key:')
			.setDesc('Use for google translation:')
			.addText(text => text
				.setPlaceholder('Enter your secret API key')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pdf to markdown API key:')
			.setDesc('Translate pdf to markdown:')
			.addText(text => text
				.setPlaceholder('Enter your secret API key')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
