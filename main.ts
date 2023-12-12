import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting,
	     WorkspaceLeaf, TFile, SplitDirection, ObsidianProtocolData } from 'obsidian';

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

const DEFAULT_SETTINGS: ParallelMarkdownSettings = {
	mySetting: 'default',
	DIRECTION: 'vertical',
	CLOSE_OTHER: true
}

export default class ParalleMarkdownPlugin extends Plugin {
	settings: ParallelMarkdownSettings;
	leafRight: WorkspaceLeaf;
	leafLeft: WorkspaceLeaf;


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
		statusBarItemEl.setText('Parallel Markdown editor plugin');

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

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});


		this.app.workspace.onLayoutReady(() => {
			this.openSplitPaneView();
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.registerObsidianProtocolHandler(
            'file-open',
            this.actionHandler,
        );

		this.app.workspace.on("file-open", async (file) => {
			if (!file) {
				return
			}
			if(file.basename === "name1" || file.basename === "name2") {
				return
			}
			console.log('Open file: ', file)
		})

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

	async actionHandler(params: ObsidianProtocolData): Promise<void> {
		console.log("get a message:");
		console.log(params.action);
		if (params.action == 'file-open') {
			console.log("try to open file");
			console.log(params)
		}
	}

	getMostRecentMDLeaf(): WorkspaceLeaf | null {
		const mrl = this.app.workspace.getMostRecentLeaf();
		if (mrl && mrl.view.getViewType() === 'markdown') {
			return mrl;
		} else {
			return null;
		}
	}

	//if it is left & right side panels, return
	//else change the layout to left&right side panels
	async openSplitPaneView() {
		//TODO: temparally method to do panels check, is there a better way?
		console.log("try to iterate all leaves");
		var i: number = 0;
		this.app.workspace.iterateAllLeaves((leaf) => {
			//console.log("read a leaf: ", leaf.getViewState().type);
			if (leaf.getViewState().type === "markdown") {
				if (i==0) {
					this.leafLeft = leaf;
				} else {
					this.leafRight = leaf;
				}

				i = i + 1;
			}
		});
		
		if (i>=2) {
			console.log("Already have left&right leaf, do nothing");
			this.openParallelFiles();
			return;
		}

		// split view
		const srcLeaf: WorkspaceLeaf | null = this.getMostRecentMDLeaf();
		//const srcView = <MarkdownView>srcLeaf?.view ?? null;

		const newLeaf = this.app.workspace.getLeaf('split', this.settings.DIRECTION); // open a split window
		this.app.workspace.setActiveLeaf(newLeaf);

		if (srcLeaf) {
			//srcLeaf.setGroupMember(newLeaf);// don't need to open the same file together
			this.app.workspace.setActiveLeaf(srcLeaf);
		}

		if (srcLeaf) {
			this.leafLeft = srcLeaf;
		}

		this.leafRight = newLeaf;
		this.openParallelFiles();
	}

	async openParallelFiles() {
		// choose parallel files
		const files = await this.app.vault.getMarkdownFiles();
		const selectedEN = files.filter(file => file.name === "witte-en.md")[0];
		const selectedCN = files.filter(file => file.name === "witte-cn.md")[0];

		console.log('selected file is: ', selectedEN.name)
		await this.leafLeft.openFile(selectedEN, { state: { mode: 'source', active: true, focus: false } });
		this.app.workspace.setActiveLeaf(this.leafLeft);

		console.log('selected file is: ', selectedCN.name)
		await this.leafRight.openFile(selectedCN, { state: { mode: 'source', active: true, focus: false } });
		//this.app.workspace.setActiveLeaf(this.leafRight);
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
