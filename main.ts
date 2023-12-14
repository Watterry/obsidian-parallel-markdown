import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting,
	     WorkspaceLeaf, TFile, SplitDirection, ObsidianProtocolData, View } from 'obsidian';

// Remember to rename these classes and interfaces!

declare module "obsidian" {
	interface View {
		file: TFile;
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

		// add Parallel trigger icon
		const ribbonIconEl = this.addRibbonIcon('check-check', 'Parallel', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			var ctx = this.app.workspace.getActiveViewOfType(MarkdownView) as MarkdownView;
			if (!ctx) {
				ctx = <MarkdownView>this.leafLeft?.view ?? null;
			}
			this.parallelLeftToRight(ctx.editor, ctx);
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

		this.addCommand({
			id: "parallel-position",
			name: "Parallel position",
			editorCallback: (editor: Editor, ctx: MarkdownView) => {
				this.parallelLeftToRight(editor, ctx);
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
			if(file.basename === "witte-en") {
				console.log('Open file: ', file)
	
				// await this.leafLeft.openFile(file, { state: { mode: 'source', active: true, focus: false } });
				// this.app.workspace.setActiveLeaf(this.leafLeft);
	
				// console.log("try to open parallel file");
	
				// const parallelFile = this.app.vault.getAbstractFileByPath('witte-cn.md');
				// if (parallelFile instanceof TFile) {
				// 	console.log('parallel file is: ', parallelFile)
				// 	await this.leafRight.openFile(parallelFile, { state: { mode: 'source', active: true, focus: false } });
				// } else {
				// 	// fileOrFolder is null or a TFolder... handle accordingly
				// }
			}

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

		//const selectedEN = files.filter(file => file.name === "witte-en.md")[0];
		//const selectedCN = files.filter(file => file.name === "witte-cn.md")[0];

		//random choose two files to open
		//TODO: should choose files according to history or file name pattern
	    const selectedEN = files[0];
		const selectedCN = files[1];

		console.log('selected file is: ', selectedEN.name)
		await this.leafLeft.openFile(selectedEN, { state: { mode: 'source', active: true, focus: false } });
		this.app.workspace.setActiveLeaf(this.leafLeft);

		console.log('selected file is: ', selectedCN.name)
		await this.leafRight.openFile(selectedCN, { state: { mode: 'source', active: true, focus: false } });
		//this.app.workspace.setActiveLeaf(this.leafRight);
	}

	private parallelLeftToRight(editor: Editor, ctx: MarkdownView) {
		console.log('command callback: parallelLeftToRight')

		var sourceView: MarkdownView = <MarkdownView>this.leafLeft?.view ?? null;
		var targetView: MarkdownView = <MarkdownView>this.leafRight?.view ?? null;
        if (ctx === <MarkdownView>this.leafRight?.view) {
			console.log("exchange source and target:");
			targetView = sourceView;
			sourceView = ctx;
		}

		//const sourceView = <MarkdownView>this.leafLeft?.view ?? null;
		//const targetView = <MarkdownView>this.leafRight?.view ?? null;
		if (sourceView && targetView) {
			const file = this.app.workspace.getActiveFile();
			console.log("TFile:", file);

			// sync method 1
			// const numberOfLines = sourceView.editor.getCursor().line;
			// console.log("file length is:", numberOfLines);
			// targetView.currentMode.applyScroll((numberOfLines - 1));

			// sync method 2
			var target = sourceView.editor.getCursor();
			targetView.editor.setCursor(target);
		} else {
			console.log("This is not left & right view layout");
		}

		new Notice('success parallel markdown files');
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
