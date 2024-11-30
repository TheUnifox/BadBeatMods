let mods = document.getElementById(`mods`);
mods.appendChild(generateMod({
    title: `BSIPA`,
    modder: `nike4613`,
    description: `this mod is kinda really important. only a little tho.`,
    lastUpdated: `idfk, yesterday?`,
    versions: [`1.0.0`]
}));

function generateMod(modObj) {
    let mod = document.createElement(`div`);
    mod.className = `mod`;
    let modContent = document.createElement(`div`);
    modContent.className = `flex-row`;
    let modImage = document.createElement(`img`);
    modImage.src = `https://github.com/nike4613/BeatSaber-IPA-Reloaded/blob/a81bad951faa2996c93ab866290a8f11e87270ce/IPA.Loader/icon_white.png?raw=true`;
    modImage.alt = `BSIPA`;
    modImage.width = 60;
    modImage.height = 60;
    let modInfo = document.createElement(`div`);
    modInfo.className = `flex-column`;
    let modTitle = document.createElement(`p`);
    modTitle.id = `modTitle`;
    modTitle.innerHTML = `${modObj.title} <a id="modAuthor">by ${modObj.modder}</a>`;
    let modDesc = document.createElement(`p`);
    modDesc.id = `modDesc`;
    modDesc.innerHTML = modObj.description;
    modInfo.appendChild(modTitle);
    modInfo.appendChild(modDesc);
    modContent.appendChild(modImage);
    modContent.appendChild(modInfo);
    mod.appendChild(modContent);
    let modFooter = document.createElement(`div`);
    modFooter.className = `flex-row`;
    let lastUpdated = document.createElement(`p`);
    lastUpdated.id = `lastUpdated`;
    lastUpdated.innerHTML = `Last Update: ` + modObj.lastUpdated;
    let modButtons = document.createElement(`div`);
    modButtons.className = `flex-float-right mod-buttons`;
    let versionSelect = document.createElement(`select`);
    versionSelect.id = `versionSelect`;
    for (let i = 0; i < modObj.versions.length; i++) {
        let versionOption = document.createElement(`option`);
        versionOption.value = modObj.versions[i];
        versionOption.innerHTML = modObj.versions[i];
        versionSelect.appendChild(versionOption);
    }
    let downloadButton = document.createElement(`button`);
    downloadButton.id = `download`;
    downloadButton.innerHTML = `Download`;
    let moreInfoButton = document.createElement(`button`);
    moreInfoButton.id = `moreInfo`;
    moreInfoButton.innerHTML = `More Info`;
    modButtons.appendChild(versionSelect);
    modButtons.appendChild(downloadButton);
    modButtons.appendChild(moreInfoButton);
    modFooter.appendChild(lastUpdated);
    modFooter.appendChild(modButtons);
    mod.appendChild(modFooter);
    return mod;
}