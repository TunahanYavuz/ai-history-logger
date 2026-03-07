import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- ÇOKLU DİL (i18n) SÖZLÜĞÜ ---
const messages = {
    en: {
        needFolder: "AI Log: Please open a project folder first.",
        snapshotTaking: "AI Log: Taking Shadow Git snapshot...",
        snapshotSuccess: "🤖 AI Log: Snapshot taken successfully. You can run the AI!",
        error: "AI Log Error: ",
        noChanges: "AI Log: The AI didn't change any files. Nothing to save.",
        promptTitle: "What command did you give to the AI?",
        promptPlaceholder: "Paste your prompt here (Press Enter to skip, it won't close if you click away)",
        promptNotProvided: "Not provided.",
        diffCaught: "AI Log: Changes successfully caught!",
        saveSuccess: "AI Log: Changes successfully saved and archived!",
        rollbackNeedFile: "AI Log: Please open the AI_Summary.md file you want to revert.",
        rollbackWrongFile: "AI Log: This command only works on summary files in the '.ai-history' folder.",
        rollbackStart: "AI Log: Time machine activated, reverting changes...",
        rollbackSuccess: "🔄 AI Log: Success! Files have been reverted to their pre-AI state.",
        rollbackError: "AI Log Revert Error: The file might have been manually modified afterwards. ",
        statusBarRecording: "$(record) AI Recording...",
		rollbackBadge: "> 🛑 **WARNING:** This AI change has been REVERTED! The code is back to its original state.\n\n",
		beforeState: "❌ Before State (Before AI):",
		afterState: "✅ After State (After AI):",
		changeLocation: "📍 Change Location: ~Line ",
		gitMissing: "AI Log Error: Git is not installed or not found in your PATH. This extension requires Git to function.",
	},
    tr: {
        needFolder: "AI Log: Lütfen önce bir proje klasörü açın.",
        snapshotTaking: "AI Log: Gölge Git snapshot alınıyor...",
        snapshotSuccess: "🤖 AI Log: Snapshot başarıyla alındı. Yapay zekayı çalıştırabilirsiniz!",
        error: "AI Log Hatası: ",
        noChanges: "AI Log: Yapay zeka hiçbir dosyayı değiştirmemiş. Kaydedilecek bir şey yok.",
        promptTitle: "Yapay zekaya hangi komutu verdiniz?",
        promptPlaceholder: "Promptunuzu buraya yapıştırın (Atlamak için Enter'a basın, başka yere tıklarsanız kapanmaz)",
        promptNotProvided: "Belirtilmedi.",
        diffCaught: "AI Log: Değişiklikler başarıyla yakalandı!",
        saveSuccess: "AI Log: Değişiklikler başarıyla kaydedildi ve arşivlendi!",
        rollbackNeedFile: "AI Log: Lütfen önce geri almak istediğiniz AI_Summary.md dosyasını açın.",
        rollbackWrongFile: "AI Log: Bu komut sadece '.ai-history' klasöründeki özet dosyalarında çalışır.",
        rollbackStart: "AI Log: Zaman makinesi devrede, değişiklikler geri alınıyor...",
        rollbackSuccess: "🔄 AI Log: İşlem başarılı! Dosyalar AI dokunmadan önceki haline geri döndü.",
        rollbackError: "AI Log Geri Alma Hatası: Bu dosya sonrasında manuel olarak değiştirilmiş olabilir. ",
        statusBarRecording: "$(record) AI Kayıtta...",
		rollbackBadge: "> 🛑 **DİKKAT:** Bu yapay zeka değişikliği GERİ ALINMIŞTIR! Kodlar orijinal haline döndü.\n\n",
		changeLocation: "📍 Değişiklik Konumu: ~Satır ",
		afterState: "✅ Sonraki Hal (After AI):",
		beforeState: "❌ Önceki Hal (Before AI):",
		gitMissing: "AI Log Hatası: Git bilgisayarınızda yüklü değil veya PATH ayarlarında yok. Eklentinin çalışması için Git şarttır.",
    }
};

// Çevirmen Fonksiyonu
function t(key: keyof typeof messages.en): string {
    const lang = vscode.env.language.startsWith('tr') ? 'tr' : 'en';
    return messages[lang][key];
}

const execAsync = util.promisify(cp.exec);

// --- AKILLI GİT DEDEKTİFİ (Memoization Pattern) ---
async function checkGit(): Promise<boolean> {
    // 1. Durum: Cevabı zaten biliyorsak, terminali yorma, direkt RAM'den dön!
    if (hasGitCache !== null) {
        return hasGitCache;
    }

    // 2. Durum: İlk defa çalışıyorsa (null ise), terminale sor ve sonucu kalıcı olarak hafızaya yaz.
    try {
        await execAsync('git --version');
        hasGitCache = true; 
        return true;
    } catch (error) {
        hasGitCache = false; 
        return false;
    }
}

let hasGitCache: boolean | null = null;
let statusBarItem: vscode.StatusBarItem; 

// --- 1. SNAPSHOT ALMA ---
async function takeSnapshot() {
	const hasGit = await checkGit();

	if (!hasGit) {
		vscode.window.showErrorMessage(t("gitMissing"));
		return;
	}

    if(!vscode.workspace.workspaceFolders){
        vscode.window.showErrorMessage(t("needFolder"));
        return;
    }
    
    await vscode.workspace.saveAll(false);
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

    try{
        vscode.window.showInformationMessage(t("snapshotTaking"));
        const options = {cwd: workspacePath};

        const shadowPath = path.join(workspacePath, '.ai-shadow');
        await fs.mkdir(shadowPath, { recursive: true });        
        await execAsync(`git --git-dir=.ai-shadow/.git --work-tree=. init`, options);
        await execAsync(`git --git-dir=.ai-shadow/.git --work-tree=. add .`, options);
        await execAsync(`git -c user.name="AI History Logger" -c user.email="logger@ai.local" --git-dir=.ai-shadow/.git --work-tree=. commit --allow-empty -m "AI_START"`, options);

        vscode.window.showInformationMessage(t("snapshotSuccess"));   
        statusBarItem.text = t("statusBarRecording");
        statusBarItem.color = "#ecca18";
        statusBarItem.show();
    }catch(error){
        vscode.window.showErrorMessage(`${t("error")}${error}`);
    }   
}

// --- 2. DEĞİŞİKLİKLERİ KAYDETME ---
async function saveChanges() {
	const hasGit = await checkGit();

	if (!hasGit) {
		vscode.window.showErrorMessage(t("gitMissing"));
		return;
	}

    if(!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage(t("needFolder"));
        statusBarItem.hide();
        return;
    }
    await vscode.workspace.saveAll(false);
    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const options = {cwd: workspacePath};

    try {
		const dynamicIgnores = await getDynamicIgnores(workspacePath);
        const pathspecs = dynamicIgnores.map(ig => `':!${ig}'`).join(' ');

        await execAsync(`git --git-dir=.ai-shadow/.git --work-tree=. add -A`, options);

        const diffCommand = `git --git-dir=.ai-shadow/.git --work-tree=. diff --staged HEAD -- . ${pathspecs}`;     
        const {stdout} = await execAsync(diffCommand, options);

        // Boş diff kontrolü
        if(!stdout || stdout.trim() === ''){
            vscode.window.showInformationMessage(t("noChanges"));
            const shadowPath = path.join(workspacePath, '.ai-shadow');
            await fs.rm(shadowPath, { recursive: true, force: true });
            statusBarItem.hide();
            return;
        }

        // Prompt Alma Mimarisi (Çivili)
        const userPrompt = await vscode.window.showInputBox({
            prompt: t("promptTitle"),
            placeHolder: t("promptPlaceholder"),
            ignoreFocusOut: true
        });

        const finalPrompt = (userPrompt && userPrompt.trim() !== '') ? userPrompt : t("promptNotProvided");
        vscode.window.showInformationMessage(t("diffCaught"));

        // Ayrıştırma İşlemi
        const parsedDiff = parseDiffToMarkdown(stdout);
        const markdownContent = `> 💬 **Prompt:** *${finalPrompt}*\n\n` + parsedDiff;

        // Klasörleme
        const date = new Date();
        const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
        const historyFolder = path.join(workspacePath, '.ai-history', timestamp);
        
        await fs.mkdir(historyFolder, {recursive: true});

        const mdFilePath = path.join(historyFolder, 'AI_Summary.md');
        const patchFilePath = path.join(historyFolder, 'rollback.patch');
        
        await Promise.all([
            fs.writeFile(mdFilePath, markdownContent, 'utf8'),
            fs.writeFile(patchFilePath, stdout, 'utf8')
        ]);

        const document = await vscode.workspace.openTextDocument(mdFilePath);
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage(t("saveSuccess"));

        const shadowPath = path.join(workspacePath, '.ai-shadow');
        await fs.rm(shadowPath, { recursive: true, force: true });
    }catch (error) {
        vscode.window.showErrorMessage(`${t("error")}${error}`);
    }
    statusBarItem.hide();
}

// --- ZAMAN MAKİNESİ (ROLLBACK) ---
async function rollbackChanges() {
	const hasGit = await checkGit();

	if (!hasGit) {
		vscode.window.showErrorMessage(t("gitMissing"));
		return;
	}
	
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(t("rollbackNeedFile"));
        return;
    }

    const documentPath = editor.document.uri.fsPath;

    if (!documentPath.includes('.ai-history') || !documentPath.endsWith('.md')) {
        vscode.window.showErrorMessage(t("rollbackWrongFile"));
        return;
    }

    const patchPath = path.join(path.dirname(documentPath), 'rollback.patch');
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath; 
    if (!workspacePath) {return;}

    try {
        vscode.window.showInformationMessage(t("rollbackStart"));
        const options = {cwd: workspacePath};

        await execAsync(`git apply --reverse "${patchPath}"`, options);
        vscode.window.showInformationMessage(t("rollbackSuccess"));

		const mdContent = await fs.readFile(documentPath, 'utf8');

		if (!mdContent.includes("🛑")) {
			const updatedContent = t("rollbackBadge") + mdContent;
			await fs.writeFile(documentPath, updatedContent, 'utf8');
		}
    } catch (error) {
        vscode.window.showErrorMessage(`${t("rollbackError")}${error}`);
    }
}

// --- YARDIMCI FONKSİYONLAR ---
function parseDiffToMarkdown(diffText: string): string {
    const lines = diffText.split(/\r?\n/);
    let markdownOutput = "";

    let currentFile = "";
    let beforeCode: string[] = [];
    let afterCode: string[] = [];
    let inChunk = false; 

    const flushChunk =  () => {
        if (inChunk) {
            const lang = getMarkdownLang(currentFile);
            // DİNAMİK DİL ÇEVİRİSİ BURAYA EKLENDİ!
            markdownOutput += `\n**${t("beforeState")}**\n\`\`\`${lang}\n${beforeCode.join('\n')}\n\`\`\`\n`;     
            markdownOutput += `\n**${t("afterState")}**\n\`\`\`${lang}\n${afterCode.join('\n')}\n\`\`\`\n`;
            beforeCode = [];
            afterCode = [];
            inChunk = false;
        }
    };

    for (const line of lines) {
        if (line.startsWith('diff --git')){
            flushChunk(); 
            const match = line.match(/ b\/(.+)$/);
            if (match) {
                currentFile = match[1];
                markdownOutput += `\n---\n## 📄 Dosya: \`${currentFile}\`\n`; // Buradaki Dosya kelimesini de çevirebilirsin ama kod okurken çok göze batmıyor.
            }
        }
        else if (line.startsWith('@@')) {
            flushChunk(); 
            const match = line.match(/@@ -\d+,\d+ \+(\d+),\d+/);
            const startingLine = match ? match[1]: "?";
            // DİNAMİK DİL ÇEVİRİSİ BURAYA EKLENDİ!
            markdownOutput += `\n> ${t("changeLocation")}${startingLine}\n`;
            inChunk = true;
        }
        else if (line.startsWith('-') && !line.startsWith('---')) {
            beforeCode.push(line.substring(1)); 
        }
        else if (line.startsWith('+') && !line.startsWith('+++')) {
            afterCode.push(line.substring(1)); 
        }
        else if (line.startsWith(' ')) {
            const cleanLine = line.substring(1);
            beforeCode.push(cleanLine);
            afterCode.push(cleanLine);
        }
    }

    flushChunk();
    return markdownOutput;
}

function getMarkdownLang(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: {[key: string]: string} = {
        'rs': 'rust',
        'py': 'python',
        'ts': 'typescript',
        'js': 'javascript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown'
    };
    return ext && langMap[ext]? langMap[ext]: '';
}

// --- EKLENTİ KAYITLARI ---
export function activate(context: vscode.ExtensionContext){
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    let startCommand = vscode.commands.registerCommand('ai-history.start', () => takeSnapshot());
    let saveCommand = vscode.commands.registerCommand('ai-history.save', () => saveChanges());
    let rollbackCommand = vscode.commands.registerCommand('ai-history.rollback', () => rollbackChanges());

    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(startCommand);
    context.subscriptions.push(saveCommand);
    context.subscriptions.push(rollbackCommand);
}

// --- DİNAMİK KARA LİSTE (IGNORE) MOTORU ---
async function getDynamicIgnores(workspacePath: string): Promise<string[]> {
    // 1. Kırmızı çizgilerimiz (Bunlar her zaman yoksayılacak)
    const mandatoryIgnores = ['.git', '.ai-shadow'];
    let userIgnores: string[] = [];

    const aiIgnorePath = path.join(workspacePath, '.aiignore');
    const gitIgnorePath = path.join(workspacePath, '.gitignore');

    try {
        let fileContent = "";
        
        // 2. Önce .aiignore var mı diye bak, yoksa .gitignore'u dene
        try {
            fileContent = await fs.readFile(aiIgnorePath, 'utf8');
        } catch {
            fileContent = await fs.readFile(gitIgnorePath, 'utf8');
        }

        // 3. Dosyayı satır satır böl, temizle ve diziye at
        userIgnores = fileContent
            .split('\n')
            .map(line => line.trim())
            // Boş satırları ve # ile başlayan yorumları çöpe at
            .filter(line => line.length > 0 && !line.startsWith('#')) 
            // Klasör sonundaki / işaretlerini temizle (Git pathspec formatı için daha güvenlidir)
            .map(line => line.endsWith('/') ? line.slice(0, -1) : line);

    } catch (error) {
        // Eğer hiçbir ignore dosyası bulamazsa sessizce devam et
        console.log("AI Log: Ignore dosyası bulunamadı, varsayılanlar kullanılacak.");
    }

    // 4. Kırmızı çizgilerimizle kullanıcının listesini birleştir ve Set ile tekrarları sil
    const combinedIgnores = [...mandatoryIgnores, ...userIgnores];
    return Array.from(new Set(combinedIgnores));
}

// İnatçı yazım hatası düzeltildi! :D
export function deactivate(){}