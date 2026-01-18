// SGC-MineGesty - Application JavaScript
// ===================================

// --- Configuration par defaut ---
const CONFIG_DEFAULT = {
    version: "1.0",
    etatsEquipement: [
        { id: "operationnel", label: "Operationnel", color: "success" },
        { id: "en_panne", label: "En Panne", color: "danger" },
        { id: "declare", label: "Declare", color: "warning" },
        { id: "inactif", label: "Inactif", color: "secondary" },
        { id: "en_reparation", label: "En Reparation", color: "warning" },
        { id: "repare", label: "Repare", color: "info" },
        { id: "non_reparable", label: "Non Reparable", color: "danger" },
        { id: "restitue", label: "Restitue au Client", color: "info" },
        { id: "remplace", label: "Remplace", color: "info" },
        { id: "redeploye", label: "Redeploye", color: "info" }
    ],
    typesAttribution: ["Location", "Vente", "Paiement Differe (RG)"],
    typesEquipement: ["TPE", "Carte_Gestion", "SIM"],
    marques: ["NewPos", "Move"],
    customFields: { clients: [], equipements: [] },
    mappingImportExcel: {
        "Mode de L'operation": "modeOperation",
        "District": "district",
        "Entite Commerciale": "entiteCommerciale",
        "Code Station": "codeClient",
        "Raison Social": "raisonSociale",
        "N Serie TPE": "numeroSerie",
        "Date de Reception": "dateReception",
        "Date EnvoieFournisseur": "dateEnvoiFournisseur",
        "Nature de la Panne TPE": "naturePanne",
        "N Serie Sim": "numeroSerieSim",
        "Entite Reconfig": "entiteReconfig",
        "Code Station pour Reconfiguration": "codeStationReconfig",
        "Raison Social Reconfig": "raisonSocialeReconfig",
        "BTS": "bts",
        "Carte Gestion": "carteGestion",
        "Etat TPE": "etatTpe"
    }
};

// --- E‰tat Global ---
let state = {
    clients: [],
    equipements: [],
    cartes: [],
    reclamations: [],
    config: JSON.parse(JSON.stringify(CONFIG_DEFAULT)),
    vueActive: 'dashboard',
    equipementEnCours: null,
    clientEnCours: null,
    reclamationEnCours: null,
    donneesImport: null,
    charts: {}
};

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    chargerDepuisLocalStorage();
    initialiserNavigation();
    initialiserDropZone();
    initialiserSelects();
    afficherVue('dashboard');
    rafraichirDashboard();
});

function chargerDepuisLocalStorage() {
    try {
        const clientsData = localStorage.getItem('sgc_clients');
        const equipementsData = localStorage.getItem('sgc_equipements');
        const cartesData = localStorage.getItem('sgc_cartes');
        const configData = localStorage.getItem('sgc_config');

        if (clientsData) state.clients = JSON.parse(clientsData);
        if (equipementsData) state.equipements = JSON.parse(equipementsData);
        if (cartesData) state.cartes = JSON.parse(cartesData);
        if (configData) state.config = { ...CONFIG_DEFAULT, ...JSON.parse(configData) };

        toast('Donnees chargees depuis le stockage local', 'info');
    } catch (e) {
        console.error('Erreur chargement localStorage:', e);
    }
}

function sauvegarderVersLocalStorage() {
    try {
        localStorage.setItem('sgc_clients', JSON.stringify(state.clients));
        localStorage.setItem('sgc_equipements', JSON.stringify(state.equipements));
        localStorage.setItem('sgc_cartes', JSON.stringify(state.cartes));
        localStorage.setItem('sgc_config', JSON.stringify(state.config));
        return true;
    } catch (e) {
        console.error('Erreur sauvegarde localStorage:', e);
        return false;
    }
}

// --- Navigation ---
function initialiserNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const vue = item.dataset.view;
            if (vue) afficherVue(vue);
        });
    });
}

function afficherVue(vue) {
    state.vueActive = vue;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const viewEl = document.getElementById(`view-${vue}`);
    const navEl = document.querySelector(`[data-view="${vue}"]`);

    if (viewEl) viewEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    const titres = {
        dashboard: ['Dashboard', 'Vue d\'ensemble des equipements'],
        clients: ['Clients', 'Gestion des clients'],
        equipements: ['E‰quipements', 'Gestion des equipements TPE'],
        cartes: ['Cartes & SIM', 'Gestion des cartes et SIM'],
        inventaire: ['Inventaire', 'Inventaire complet avec filtres et reconstitution'],
        historique: ['Historique', 'Tracabilite des actions'],
        reclamations: ['Reclamations', 'Gestion et suivi des reclamations'],
        import: ['Import', 'Importer depuis Excel'],
        export: ['Export', 'Exporter les donnees'],
        config: ['Configuration', 'Parametres de l\'application'],
        champs: ['Champs Dynamiques', 'Gerer les champs personnalises']
    };

    const [titre, sousTitre] = titres[vue] || ['', ''];
    document.getElementById('pageTitle').textContent = titre;
    document.getElementById('pageSubtitle').textContent = sousTitre;

    // Rafraichir la vue
    switch (vue) {
        case 'dashboard': rafraichirDashboard(); break;
        case 'clients': rafraichirTableClients(); break;
        case 'equipements': rafraichirTableEquipements(); break;
        case 'cartes': rafraichirTableCartes(); break;
        case 'inventaire': rafraichirInventaire(); break;
        case 'historique': initialiserFiltresHistorique(); break;
        case 'reclamations': rafraichirReclamations(); break;
        case 'config': rafraichirConfig(); break;
        case 'champs': rafraichirChampsDynamiques(); break;
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// --- Dashboard ---
function rafraichirDashboard() {
    // Statistiques
    document.getElementById('totalEquipements').textContent = state.equipements.length;
    document.getElementById('totalClients').textContent = state.clients.length;
    document.getElementById('totalOperationnels').textContent =
        state.equipements.filter(e => e.etat === 'operationnel').length;
    document.getElementById('totalPannes').textContent =
        state.equipements.filter(e => e.etat === 'en_panne').length;
    document.getElementById('totalReparation').textContent =
        state.equipements.filter(e => e.etat === 'en_reparation').length;

    // Graphiques
    creerGraphiqueEtats();
    creerGraphiqueWilaya();
    creerGraphiqueMarque();
}

function creerGraphiqueEtats() {
    const ctx = document.getElementById('chartEtats');
    if (!ctx) return;

    if (state.charts.etats) state.charts.etats.destroy();

    const etatsCount = {};
    state.config.etatsEquipement.forEach(e => etatsCount[e.id] = 0);
    state.equipements.forEach(eq => {
        if (etatsCount[eq.etat] !== undefined) etatsCount[eq.etat]++;
    });

    const colors = {
        operationnel: '#22c55e', en_panne: '#ef4444', declare: '#f59e0b',
        inactif: '#64748b', en_reparation: '#f59e0b', repare: '#3b82f6',
        non_reparable: '#ef4444', restitue: '#3b82f6', remplace: '#3b82f6', redeploye: '#3b82f6'
    };

    state.charts.etats = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: state.config.etatsEquipement.map(e => e.label),
            datasets: [{
                data: Object.values(etatsCount),
                backgroundColor: state.config.etatsEquipement.map(e => colors[e.id] || '#6366f1')
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
    });
}

function creerGraphiqueWilaya() {
    const ctx = document.getElementById('chartWilaya');
    if (!ctx) return;

    if (state.charts.wilaya) state.charts.wilaya.destroy();

    const wilayaCount = {};
    state.clients.forEach(c => {
        const w = c.wilaya || 'Non renseigne';
        wilayaCount[w] = (wilayaCount[w] || 0) + state.equipements.filter(e => e.clientId === c.id).length;
    });

    state.charts.wilaya = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(wilayaCount).slice(0, 10),
            datasets: [{ label: 'E‰quipements', data: Object.values(wilayaCount).slice(0, 10), backgroundColor: '#6366f1' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } }
    });
}

function creerGraphiqueMarque() {
    const ctx = document.getElementById('chartMarque');
    if (!ctx) return;

    if (state.charts.marque) state.charts.marque.destroy();

    const marqueCount = {};
    state.equipements.forEach(e => {
        const m = e.marque || 'Non renseigne';
        marqueCount[m] = (marqueCount[m] || 0) + 1;
    });

    state.charts.marque = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(marqueCount),
            datasets: [{ data: Object.values(marqueCount), backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
    });
}

// --- Gestion Clients ---
function rafraichirTableClients() {
    const tbody = document.querySelector('#tableClients tbody');
    tbody.innerHTML = '';

    // Mise E  jour filtres
    const wilayas = [...new Set(state.clients.map(c => c.wilaya).filter(Boolean))];
    const districts = [...new Set(state.clients.map(c => c.district).filter(Boolean))];

    const filtreWilaya = document.getElementById('filtreWilaya');
    const filtreDistrict = document.getElementById('filtreDistrict');

    filtreWilaya.innerHTML = '<option value="">Toutes Wilayas</option>' +
        wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
    filtreDistrict.innerHTML = '<option value="">Tous Districts</option>' +
        districts.map(d => `<option value="${d}">${d}</option>`).join('');

    let clientsFiltres = [...state.clients];
    if (filtreWilaya.value) clientsFiltres = clientsFiltres.filter(c => c.wilaya === filtreWilaya.value);
    if (filtreDistrict.value) clientsFiltres = clientsFiltres.filter(c => c.district === filtreDistrict.value);

    clientsFiltres.forEach(client => {
        const nbEquip = state.equipements.filter(e => e.clientId === client.id).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${client.codeClient || ''}</strong></td>
            <td>${client.raisonSociale || ''}</td>
            <td>${client.wilaya || '-'}</td>
            <td>${client.district || '-'}</td>
            <td>${client.typeAttribution || '-'}</td>
            <td><span class="badge badge-info">${nbEquip}</span></td>
            <td class="actions">
                <button class="btn-secondary btn-sm" onclick="editerClient('${client.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn-secondary btn-sm" onclick="voirEquipementsClient('${client.id}')" title="Voir equipements"><i class="fas fa-terminal"></i></button>
                <button class="btn-secondary btn-sm btn-danger" onclick="supprimerClient('${client.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrerClients() {
    rafraichirTableClients();
}

function ouvrirModalClient(id = null) {
    state.clientEnCours = id;
    document.getElementById('modalClientTitle').textContent = id ? 'Modifier Client' : 'Nouveau Client';

    // Remplir select attribution
    const selectAttrib = document.getElementById('clientAttribution');
    selectAttrib.innerHTML = '<option value="">-- Selectionner --</option>' +
        state.config.typesAttribution.map(t => `<option value="${t}">${t}</option>`).join('');

    // Generer champs dynamiques
    genererChampsDynamiques('clients', 'champsClientsDynamiques');

    if (id) {
        const client = state.clients.find(c => c.id === id);
        if (client) {
            document.getElementById('clientCode').value = client.codeClient || '';
            document.getElementById('clientRaison').value = client.raisonSociale || '';
            document.getElementById('clientDistrict').value = client.district || '';
            document.getElementById('clientEntite').value = client.entiteCommerciale || '';
            document.getElementById('clientWilaya').value = client.wilaya || '';
            document.getElementById('clientCommune').value = client.commune || '';
            document.getElementById('clientAdresse').value = client.adresse || '';
            document.getElementById('clientAttribution').value = client.typeAttribution || '';

            // Charger champs dynamiques
            if (client.customFields) {
                Object.keys(client.customFields).forEach(key => {
                    const input = document.getElementById(`custom_${key}`);
                    if (input) input.value = client.customFields[key];
                });
            }
        }
    } else {
        document.getElementById('formClient').reset();
    }

    ouvrirModal('modalClient');
}

function sauvegarderClient(e) {
    e.preventDefault();

    const client = {
        id: state.clientEnCours || genererID(),
        codeClient: document.getElementById('clientCode').value.toUpperCase(),
        raisonSociale: document.getElementById('clientRaison').value,
        district: document.getElementById('clientDistrict').value,
        entiteCommerciale: document.getElementById('clientEntite').value,
        wilaya: document.getElementById('clientWilaya').value,
        commune: document.getElementById('clientCommune').value,
        adresse: document.getElementById('clientAdresse').value,
        typeAttribution: document.getElementById('clientAttribution').value,
        dateCreation: new Date().toISOString(),
        actif: true,
        customFields: {}
    };

    // Recuperer champs dynamiques
    state.config.customFields.clients.forEach(field => {
        const input = document.getElementById(`custom_${field.nom}`);
        if (input) client.customFields[field.nom] = input.value;
    });

    if (state.clientEnCours) {
        const idx = state.clients.findIndex(c => c.id === state.clientEnCours);
        if (idx !== -1) state.clients[idx] = { ...state.clients[idx], ...client };
    } else {
        state.clients.push(client);
    }

    sauvegarderVersLocalStorage();
    fermerModal('modalClient');
    rafraichirTableClients();
    toast(state.clientEnCours ? 'Client modifie' : 'Client ajoute', 'success');
    state.clientEnCours = null;
}

function editerClient(id) {
    ouvrirModalClient(id);
}

function supprimerClient(id) {
    if (!confirm('Supprimer ce client ?')) return;
    state.clients = state.clients.filter(c => c.id !== id);
    sauvegarderVersLocalStorage();
    rafraichirTableClients();
    toast('Client supprime', 'success');
}

function voirEquipementsClient(clientId) {
    document.getElementById('filtreEtat').value = '';
    afficherVue('equipements');
    // Filtrer par client
    setTimeout(() => {
        const equips = state.equipements.filter(e => e.clientId === clientId);
        const tbody = document.querySelector('#tableEquipements tbody');
        tbody.innerHTML = '';
        equips.forEach(eq => afficherLigneEquipement(eq, tbody));
    }, 100);
}

// --- Gestion E‰quipements ---
function initialiserSelects() {
    const filtreEtat = document.getElementById('filtreEtat');
    const filtreMarque = document.getElementById('filtreMarque');
    const filtreType = document.getElementById('filtreType');

    if (filtreEtat) {
        filtreEtat.innerHTML = '<option value="">Tous E‰tats</option>' +
            state.config.etatsEquipement.map(e => `<option value="${e.id}">${e.label}</option>`).join('');
    }
    if (filtreMarque) {
        filtreMarque.innerHTML = '<option value="">Toutes Marques</option>' +
            state.config.marques.map(m => `<option value="${m}">${m}</option>`).join('');
    }
    if (filtreType) {
        filtreType.innerHTML = '<option value="">Tous Types</option>' +
            state.config.typesEquipement.map(t => `<option value="${t}">${t}</option>`).join('');
    }
}

function rafraichirTableEquipements() {
    const tbody = document.querySelector('#tableEquipements tbody');
    tbody.innerHTML = '';
    initialiserSelects();

    let equipsFiltres = [...state.equipements];
    const etat = document.getElementById('filtreEtat')?.value;
    const marque = document.getElementById('filtreMarque')?.value;
    const type = document.getElementById('filtreType')?.value;

    if (etat) equipsFiltres = equipsFiltres.filter(e => e.etat === etat);
    if (marque) equipsFiltres = equipsFiltres.filter(e => e.marque === marque);
    if (type) equipsFiltres = equipsFiltres.filter(e => e.type === type);

    equipsFiltres.forEach(eq => afficherLigneEquipement(eq, tbody));
}

function afficherLigneEquipement(eq, tbody) {
    const client = state.clients.find(c => c.id === eq.clientId);
    const etatInfo = state.config.etatsEquipement.find(e => e.id === eq.etat) || { label: eq.etat, color: 'secondary' };
    const dernierHistorique = eq.historique && eq.historique.length > 0 ? eq.historique[eq.historique.length - 1] : null;
    const dateMAJ = dernierHistorique ? new Date(dernierHistorique.date).toLocaleDateString('fr-FR') : '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${eq.numeroSerie || ''}</strong></td>
        <td>${eq.type || 'TPE'}</td>
        <td>${eq.marque || '-'}</td>
        <td>${client ? client.raisonSociale : '-'}</td>
        <td><span class="badge badge-${etatInfo.color}">${etatInfo.label}</span></td>
        <td>${dateMAJ}</td>
        <td class="actions">
            <button class="btn-secondary btn-sm" onclick="changerEtatEquipement('${eq.id}')" title="Changer etat"><i class="fas fa-exchange-alt"></i></button>
            <button class="btn-secondary btn-sm" onclick="voirHistoriqueEquipement('${eq.id}')" title="Historique"><i class="fas fa-history"></i></button>
            <button class="btn-secondary btn-sm" onclick="editerEquipement('${eq.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
            <button class="btn-secondary btn-sm btn-danger" onclick="supprimerEquipement('${eq.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
}

function filtrerEquipements() {
    rafraichirTableEquipements();
}

function filtrerParEtat(etat) {
    afficherVue('equipements');
    setTimeout(() => {
        document.getElementById('filtreEtat').value = etat === 'tous' ? '' : etat;
        rafraichirTableEquipements();
    }, 100);
}

function ouvrirModalEquipement(id = null) {
    state.equipementEnCours = id;
    document.getElementById('modalEquipementTitle').textContent = id ? 'Modifier E‰quipement' : 'Nouvel E‰quipement';

    // Remplir selects
    document.getElementById('equipType').innerHTML =
        state.config.typesEquipement.map(t => `<option value="${t}">${t}</option>`).join('');
    document.getElementById('equipMarque').innerHTML = '<option value="">-- Selectionner --</option>' +
        state.config.marques.map(m => `<option value="${m}">${m}</option>`).join('');
    document.getElementById('equipClient').innerHTML = '<option value="">-- Sans client --</option>' +
        state.clients.map(c => `<option value="${c.id}">${c.codeClient} - ${c.raisonSociale}</option>`).join('');
    document.getElementById('equipEtat').innerHTML =
        state.config.etatsEquipement.map(e => `<option value="${e.id}">${e.label}</option>`).join('');

    genererChampsDynamiques('equipements', 'champsEquipementsDynamiques');

    if (id) {
        const eq = state.equipements.find(e => e.id === id);
        if (eq) {
            document.getElementById('equipType').value = eq.type || 'TPE';
            document.getElementById('equipSerie').value = eq.numeroSerie || '';
            document.getElementById('equipMarque').value = eq.marque || '';
            document.getElementById('equipModele').value = eq.modele || '';
            document.getElementById('equipClient').value = eq.clientId || '';
            document.getElementById('equipEtat').value = eq.etat || 'operationnel';

            if (eq.customFields) {
                Object.keys(eq.customFields).forEach(key => {
                    const input = document.getElementById(`custom_${key}`);
                    if (input) input.value = eq.customFields[key];
                });
            }
        }
    } else {
        document.getElementById('formEquipement').reset();
    }

    ouvrirModal('modalEquipement');
}

function sauvegarderEquipement(e) {
    e.preventDefault();

    const equipement = {
        id: state.equipementEnCours || genererID(),
        type: document.getElementById('equipType').value,
        numeroSerie: document.getElementById('equipSerie').value,
        marque: document.getElementById('equipMarque').value,
        modele: document.getElementById('equipModele').value,
        clientId: document.getElementById('equipClient').value || null,
        etat: document.getElementById('equipEtat').value,
        dateCreation: new Date().toISOString(),
        historique: [],
        customFields: {}
    };

    state.config.customFields.equipements.forEach(field => {
        const input = document.getElementById(`custom_${field.nom}`);
        if (input) equipement.customFields[field.nom] = input.value;
    });

    if (state.equipementEnCours) {
        const idx = state.equipements.findIndex(eq => eq.id === state.equipementEnCours);
        if (idx !== -1) {
            equipement.historique = state.equipements[idx].historique || [];
            state.equipements[idx] = { ...state.equipements[idx], ...equipement };
        }
    } else {
        equipement.historique.push({
            date: new Date().toISOString(),
            action: 'creation',
            etatApres: equipement.etat,
            notes: 'Creation de l\'equipement'
        });
        state.equipements.push(equipement);
    }

    sauvegarderVersLocalStorage();
    fermerModal('modalEquipement');
    rafraichirTableEquipements();
    rafraichirDashboard();
    toast(state.equipementEnCours ? 'E‰quipement modifie' : 'E‰quipement ajoute', 'success');
    state.equipementEnCours = null;
}

function editerEquipement(id) {
    ouvrirModalEquipement(id);
}

function supprimerEquipement(id) {
    if (!confirm('Supprimer cet equipement ?')) return;
    state.equipements = state.equipements.filter(e => e.id !== id);
    sauvegarderVersLocalStorage();
    rafraichirTableEquipements();
    rafraichirDashboard();
    toast('E‰quipement supprime', 'success');
}

// --- Changement d'E‰tat ---
function changerEtatEquipement(id) {
    state.equipementEnCours = id;
    const eq = state.equipements.find(e => e.id === id);
    if (!eq) return;

    document.getElementById('modalActionTitle').textContent = `Changer etat - ${eq.numeroSerie}`;
    document.getElementById('actionNouvelEtat').innerHTML =
        state.config.etatsEquipement.filter(e => e.id !== eq.etat)
            .map(e => `<option value="${e.id}">${e.label}</option>`).join('');

    document.getElementById('actionNouveauClient').innerHTML = '<option value="">-- Selectionner --</option>' +
        state.clients.map(c => `<option value="${c.id}">${c.codeClient} - ${c.raisonSociale}</option>`).join('');

    document.getElementById('formAction').reset();
    document.getElementById('groupRemplacement').style.display = 'none';
    document.getElementById('groupRedeploiement').style.display = 'none';

    ouvrirModal('modalAction');
}

function verifierActionSpeciale() {
    const etat = document.getElementById('actionNouvelEtat').value;
    document.getElementById('groupRemplacement').style.display = etat === 'remplace' ? 'block' : 'none';
    document.getElementById('groupRedeploiement').style.display = etat === 'redeploye' ? 'block' : 'none';
}

function confirmerAction(e) {
    e.preventDefault();

    const eq = state.equipements.find(eq => eq.id === state.equipementEnCours);
    if (!eq) return;

    const nouvelEtat = document.getElementById('actionNouvelEtat').value;
    const etatAvant = eq.etat;

    const historique = {
        date: new Date().toISOString(),
        action: `changement_${nouvelEtat}`,
        etatAvant: etatAvant,
        etatApres: nouvelEtat,
        naturePanne: document.getElementById('actionNaturePanne').value,
        notes: document.getElementById('actionNotes').value,
        validePar: document.getElementById('actionValidePar').value,
        agent: typeof getAgentInfo === 'function' ? getAgentInfo() : null,
        clientId: eq.clientId
    };

    // Cas speciaux
    if (nouvelEtat === 'remplace') {
        const nouveauSerie = document.getElementById('actionRemplacement').value;
        if (nouveauSerie) {
            historique.equipementRemplacement = nouveauSerie;
            historique.notes += ` | Remplace par: ${nouveauSerie}`;
        }
    }

    if (nouvelEtat === 'redeploye') {
        const nouveauClientId = document.getElementById('actionNouveauClient').value;
        if (nouveauClientId) {
            historique.ancienClientId = eq.clientId;
            historique.nouveauClientId = nouveauClientId;
            eq.clientId = nouveauClientId;
            const nouveauClient = state.clients.find(c => c.id === nouveauClientId);
            historique.notes += ` | Redeploye vers: ${nouveauClient ? nouveauClient.raisonSociale : nouveauClientId}`;
        }
    }

    eq.etat = nouvelEtat;
    if (!eq.historique) eq.historique = [];
    eq.historique.push(historique);

    sauvegarderVersLocalStorage();
    fermerModal('modalAction');
    rafraichirTableEquipements();
    rafraichirDashboard();
    toast('E‰tat mis E  jour', 'success');
    state.equipementEnCours = null;
}

// --- Historique ---
function voirHistoriqueEquipement(id) {
    const eq = state.equipements.find(e => e.id === id);
    if (!eq) return;

    const client = state.clients.find(c => c.id === eq.clientId);

    document.getElementById('modalHistoriqueTitle').textContent = `Historique - ${eq.numeroSerie}`;

    let html = `
        <div class="historique-equip-info">
            <div><span>N Serie</span><strong>${eq.numeroSerie}</strong></div>
            <div><span>Type</span><strong>${eq.type}</strong></div>
            <div><span>Marque</span><strong>${eq.marque || '-'}</strong></div>
            <div><span>Client Actuel</span><strong>${client ? client.raisonSociale : '-'}</strong></div>
            <div><span>E‰tat Actuel</span><strong>${getEtatLabel(eq.etat)}</strong></div>
        </div>
        <div class="timeline-container">
    `;

    const historique = eq.historique || [];
    historique.slice().reverse().forEach(h => {
        const date = new Date(h.date).toLocaleString('fr-FR');
        html += `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-date">${date}</div>
                    <div class="timeline-action">${h.action.replace(/_/g, ' ').toUpperCase()}</div>
                    <div class="timeline-details">
                        ${h.etatAvant ? `<span>De: ${getEtatLabel(h.etatAvant)}</span> â†’ ` : ''}
                        ${h.etatApres ? `<span>Vers: ${getEtatLabel(h.etatApres)}</span>` : ''}
                        ${h.naturePanne ? `<br>Panne: ${h.naturePanne}` : ''}
                        ${h.notes ? `<br>Notes: ${h.notes}` : ''}
                        ${h.validePar ? `<br>Valide par: ${h.validePar}` : ''}
                        ${h.agent ? `<br><i class="fas fa-user"></i> Agent: ${h.agent}` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    document.getElementById('historiqueDetail').innerHTML = html;
    ouvrirModal('modalHistorique');
}

function getEtatLabel(etatId) {
    const etat = state.config.etatsEquipement.find(e => e.id === etatId);
    return etat ? etat.label : etatId;
}

function rechercherHistorique() {
    const numeroSerie = document.getElementById('rechercheEquip').value.trim();
    const dateDebut = document.getElementById('dateDebut').value;
    const dateFin = document.getElementById('dateFin').value;

    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    let resultats = [];

    state.equipements.forEach(eq => {
        if (numeroSerie && !eq.numeroSerie.toLowerCase().includes(numeroSerie.toLowerCase())) return;

        (eq.historique || []).forEach(h => {
            const hDate = new Date(h.date);
            if (dateDebut && hDate < new Date(dateDebut)) return;
            if (dateFin && hDate > new Date(dateFin + 'T23:59:59')) return;

            resultats.push({ ...h, equipement: eq });
        });
    });

    resultats.sort((a, b) => new Date(b.date) - new Date(a.date));

    resultats.forEach(r => {
        const date = new Date(r.date).toLocaleString('fr-FR');
        const div = document.createElement('div');
        div.className = 'timeline-item';
        div.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-date">${date} - <strong>${r.equipement.numeroSerie}</strong></div>
                <div class="timeline-action">${r.action.replace(/_/g, ' ').toUpperCase()}</div>
                <div class="timeline-details">
                    ${r.etatAvant ? `De: ${getEtatLabel(r.etatAvant)} â†’ ` : ''}
                    ${r.etatApres ? `Vers: ${getEtatLabel(r.etatApres)}` : ''}
                    ${r.naturePanne ? `<br>Panne: ${r.naturePanne}` : ''}
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    if (resultats.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">Aucun resultat trouve</p>';
    }
}

// --- Cartes & SIM ---
function rafraichirTableCartes() {
    const tbody = document.querySelector('#tableCartes tbody');
    tbody.innerHTML = '';

    state.cartes.forEach(carte => {
        const tpe = state.equipements.find(e => e.id === carte.tpeId);
        const client = tpe ? state.clients.find(c => c.id === tpe.clientId) : null;
        const etatInfo = state.config.etatsEquipement.find(e => e.id === carte.etat) || { label: carte.etat, color: 'secondary' };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${carte.type}</td>
            <td><strong>${carte.numeroSerie || ''}</strong></td>
            <td>${tpe ? tpe.numeroSerie : '-'}</td>
            <td>${client ? client.raisonSociale : '-'}</td>
            <td><span class="badge badge-${etatInfo.color}">${etatInfo.label}</span></td>
            <td class="actions">
                <button class="btn-secondary btn-sm" onclick="editerCarte('${carte.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn-secondary btn-sm btn-danger" onclick="supprimerCarte('${carte.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function ouvrirModalCarte() {
    ouvrirModalEquipement();
    document.getElementById('equipType').value = 'Carte_Gestion';
}

// --- Import Excel ---
function initialiserDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) traiterFichierExcel(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) traiterFichierExcel(e.target.files[0]);
    });
}

function traiterFichierExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                toast('Fichier vide ou sans donnees', 'error');
                return;
            }

            state.donneesImport = {
                headers: jsonData[0],
                rows: jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            };

            // Sauvegarder les donnees brutes pour visualisation
            if (typeof sauvegarderDonneesBrutes === 'function') {
                sauvegarderDonneesBrutes(state.donneesImport.headers, state.donneesImport.rows);
            }

            afficherPreviewImport();
        } catch (err) {
            console.error('Erreur lecture Excel:', err);
            toast('Erreur lors de la lecture du fichier', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function afficherPreviewImport() {
    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('importPreview').style.display = 'block';

    const stats = document.querySelector('.import-stats');
    stats.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-table"></i></div>
            <div class="stat-info">
                <span class="stat-value">${state.donneesImport.headers.length}</span>
                <span class="stat-label">Colonnes detectees</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-list"></i></div>
            <div class="stat-info">
                <span class="stat-value">${state.donneesImport.rows.length}</span>
                <span class="stat-label">Lignes</span>
            </div>
        </div>
    `;

    const mappingContainer = document.getElementById('mappingContainer');
    mappingContainer.innerHTML = '';

    // Champs disponibles dans l'application
    const champsDisponibles = [
        { key: '', label: '-- Ignorer cette colonne --' },
        { key: 'modeOperation', label: 'Mode Operation' },
        { key: 'district', label: 'District' },
        { key: 'entiteCommerciale', label: 'Entite Commerciale' },
        { key: 'codeClient', label: 'Code Client' },
        { key: 'raisonSociale', label: 'Raison Sociale' },
        { key: 'wilaya', label: 'Wilaya' },
        { key: 'commune', label: 'Commune' },
        { key: 'adresse', label: 'Adresse' },
        { key: 'telephone', label: 'Telephone' },
        { key: 'email', label: 'Email' },
        { key: 'numeroSerie', label: 'N Serie TPE' },
        { key: 'type', label: 'Type TPE' },
        { key: 'marque', label: 'Marque' },
        { key: 'modele', label: 'Modele' },
        { key: 'dateReception', label: 'Date Reception' },
        { key: 'naturePanne', label: 'Nature Panne' },
        { key: 'numeroSerieSim', label: 'N Serie SIM' },
        { key: 'carteGestion', label: 'Carte Gestion' },
        { key: 'etatTpe', label: 'Etat TPE' },
        { key: 'custom', label: '+ CHAMP PERSONNALISE' }
    ];

    // Mapping automatique intelligent - ordre de priorite: correspondances exactes d'abord
    const mappingExact = {
        // Noms exacts de colonnes typiques des fichiers TPE
        'mode operation': 'modeOperation',
        'mode operation': 'modeOperation',
        'district': 'district',
        'entite commerciale': 'entiteCommerciale',
        'entite commerciale': 'entiteCommerciale',
        'code station': 'codeClient',
        'code client': 'codeClient',
        'raison sociale': 'raisonSociale',
        'raison social': 'raisonSociale',
        'wilaya': 'wilaya',
        'commune': 'commune',
        'adresse': 'adresse',
        'telephone': 'telephone',
        'telephone': 'telephone',
        'email': 'email',
        'n serie tpe': 'numeroSerie',
        'n° serie tpe': 'numeroSerie',
        'numero serie tpe': 'numeroSerie',
        'no serie tpe': 'numeroSerie',
        'serie tpe': 'numeroSerie',
        'n serie': 'numeroSerie',
        'type': 'type',
        'marque': 'marque',
        'modele': 'modele',
        'date reception': 'dateReception',
        'date de reception': 'dateReception',
        'nature panne': 'naturePanne',
        'nature de la panne': 'naturePanne',
        'n serie sim': 'numeroSerieSim',
        'n° serie sim': 'numeroSerieSim',
        'numero serie sim': 'numeroSerieSim',
        'carte gestion': 'carteGestion',
        'etat tpe': 'etatTpe',
        'etat tpe': 'etatTpe',
        'etat': 'etatTpe',
        'etat': 'etatTpe',
        'statut': 'etatTpe'
    };

    // Patterns partiels en dernier recours (moins prioritaires)
    const mappingPartiel = {
        'operation': 'modeOperation',
        'commerciale': 'entiteCommerciale',
        'station': 'codeClient',
        'social': 'raisonSociale',
        'client': 'raisonSociale',
        'panne': 'naturePanne',
        'gestion': 'carteGestion',
        'serie tpe': 'numeroSerie',
        'n serie': 'numeroSerie',
        'serie sim': 'numeroSerieSim'
    };

    // Afficher TOUTES les colonnes du fichier Excel
    state.donneesImport.headers.forEach((header, idx) => {
        if (!header || header.toString().trim() === '') return;

        const headerStr = header.toString();
        const div = document.createElement('div');
        div.className = 'mapping-row';

        // Detection automatique du mapping - priorite: exact puis partiel
        let champDetecte = '';
        const headerLower = headerStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        // 1. Chercher correspondance exacte d'abord
        if (mappingExact[headerLower]) {
            champDetecte = mappingExact[headerLower];
        } else {
            // 2. Chercher correspondance partielle
            for (const [pattern, champ] of Object.entries(mappingPartiel)) {
                if (headerLower.includes(pattern)) {
                    champDetecte = champ;
                    break;
                }
            }
        }

        // Exemple de la premiere valeur
        const exempleValeur = state.donneesImport.rows[0] && state.donneesImport.rows[0][idx]
            ? state.donneesImport.rows[0][idx].toString().substring(0, 30)
            : '';

        // Si pas detecte, mettre sur 'custom' (champ personnalise) par defaut
        const valeurSelection = champDetecte || 'custom';

        div.innerHTML = `
            <div style="flex:1;">
                <label style="font-weight:600;">${headerStr}</label>
                ${exempleValeur ? `<small style="color:var(--text-secondary);display:block;">Ex: ${exempleValeur}${exempleValeur.length >= 30 ? '...' : ''}</small>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                ${!champDetecte ? '<span class="badge badge-warning" style="font-size:0.7rem;">Nouveau</span>' : '<span class="badge badge-success" style="font-size:0.7rem;">Detecte</span>'}
                <select data-excel-col="${headerStr}" data-col-idx="${idx}">
                    ${champsDisponibles.map(ch =>
            `<option value="${ch.key}" ${ch.key === valeurSelection ? 'selected' : ''}>${ch.label}</option>`
        ).join('')}
                </select>
                <input type="text" class="custom-field-name" placeholder="Nom du champ" 
                       style="display:${valeurSelection === 'custom' ? 'inline-block' : 'none'};width:150px;padding:5px;" 
                       value="${!champDetecte ? headerStr : ''}">
            </div>
        `;

        // Event listener pour afficher/masquer le champ personnalise
        const select = div.querySelector('select');
        const customInput = div.querySelector('.custom-field-name');
        select.addEventListener('change', () => {
            customInput.style.display = select.value === 'custom' ? 'inline-block' : 'none';
        });

        mappingContainer.appendChild(div);
    });
}

function annulerImport() {
    state.donneesImport = null;
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

function confirmerImport() {
    if (!state.donneesImport) return;

    // Recuperer le mapping avec le nouveau format
    const mapping = {};
    const customFields = {};

    document.querySelectorAll('#mappingContainer .mapping-row').forEach(row => {
        const select = row.querySelector('select');
        const customInput = row.querySelector('.custom-field-name');
        const colIdxStr = select.dataset.colIdx;
        const colIdx = colIdxStr !== undefined ? parseInt(colIdxStr, 10) : -1;

        if (isNaN(colIdx) || colIdx < 0) return; // Ignorer si pas d'index valide

        if (select.value === 'custom' && customInput && customInput.value.trim()) {
            // Champ personnalise
            customFields[colIdx] = customInput.value.trim();
        } else if (select.value && select.value !== 'custom' && select.value !== '') {
            // Champ standard (ignorer les "" qui sont "Ignorer cette colonne")
            mapping[colIdx] = select.value;
        }
    });

    let clientsAjoutes = 0, equipementsAjoutes = 0;
    const clientsMap = new Map();

    state.clients.forEach(c => clientsMap.set(c.codeClient, c));

    state.donneesImport.rows.forEach(row => {
        const rowData = {};
        const rowCustom = {};

        // Mapper les colonnes
        for (const [idx, field] of Object.entries(mapping)) {
            rowData[field] = row[parseInt(idx)];
        }
        // Mapper les champs personnalises
        for (const [idx, fieldName] of Object.entries(customFields)) {
            rowCustom[fieldName] = row[parseInt(idx)];
        }

        // Creer ou recuperer client
        if (rowData.codeClient) {
            if (!clientsMap.has(rowData.codeClient)) {
                const client = {
                    id: genererID(),
                    codeClient: rowData.codeClient,
                    raisonSociale: rowData.raisonSociale || '',
                    district: rowData.district || '',
                    entiteCommerciale: rowData.entiteCommerciale || '',
                    wilaya: rowData.wilaya || extraireWilaya(rowData.district || rowData.entiteCommerciale || ''),
                    commune: rowData.commune || '',
                    adresse: rowData.adresse || '',
                    telephone: rowData.telephone || '',
                    email: rowData.email || '',
                    dateCreation: new Date().toISOString(),
                    actif: true,
                    customFields: Object.keys(rowCustom).length > 0 ? { ...rowCustom } : {}
                };
                state.clients.push(client);
                clientsMap.set(client.codeClient, client);
                clientsAjoutes++;
            }
        }

        // Creer equipement
        if (rowData.numeroSerie) {
            const existant = state.equipements.find(e => e.numeroSerie === rowData.numeroSerie);
            if (!existant) {
                const client = clientsMap.get(rowData.codeClient);
                const equipement = {
                    id: genererID(),
                    type: rowData.type || 'TPE',
                    numeroSerie: rowData.numeroSerie,
                    marque: rowData.marque || detecterMarque(rowData.numeroSerie),
                    modele: rowData.modele || '',
                    clientId: client ? client.id : null,
                    etat: convertirEtat(rowData.etatTpe || rowData.modeOperation),
                    dateCreation: new Date().toISOString(),
                    historique: [{
                        date: rowData.dateReception ? parseDate(rowData.dateReception) : new Date().toISOString(),
                        action: 'import',
                        etatApres: convertirEtat(rowData.etatTpe || rowData.modeOperation),
                        naturePanne: rowData.naturePanne || '',
                        notes: `Importe depuis Excel - ${rowData.modeOperation || ''}`,
                        agent: typeof getAgentInfo === 'function' ? getAgentInfo() : null
                    }],
                    customFields: Object.keys(rowCustom).length > 0 ? { ...rowCustom } : {}
                };
                state.equipements.push(equipement);
                equipementsAjoutes++;

                // Creer carte SIM si presente
                if (rowData.numeroSerieSim) {
                    state.cartes.push({
                        id: genererID(),
                        type: 'SIM',
                        numeroSerie: rowData.numeroSerieSim,
                        tpeId: equipement.id,
                        etat: equipement.etat,
                        dateCreation: new Date().toISOString()
                    });
                }

                // Creer carte gestion si presente
                if (rowData.carteGestion) {
                    state.cartes.push({
                        id: genererID(),
                        type: 'Carte_Gestion',
                        numeroSerie: rowData.carteGestion,
                        tpeId: equipement.id,
                        etat: equipement.etat,
                        dateCreation: new Date().toISOString()
                    });
                }
            }
        }
    });

    sauvegarderVersLocalStorage();
    annulerImport();
    rafraichirDashboard();
    toast(`Import termine: ${clientsAjoutes} clients, ${equipementsAjoutes} equipements`, 'success');
}

function extraireWilaya(texte) {
    if (!texte) return '';
    const match = String(texte).match(/ANNABA|CONSTANTINE|ALGER|ORAN|SETIF|BATNA|BISKRA|BECHAR/i);
    return match ? match[0].toUpperCase() : '';
}

function detecterMarque(numeroSerie) {
    if (!numeroSerie) return '';
    const ns = String(numeroSerie).toUpperCase();
    if (ns.includes('WL') || ns.startsWith('16')) return 'NewPos';
    if (ns.includes('MV') || ns.includes('MOVE')) return 'Move';
    return '';
}

function convertirEtat(etatExcel) {
    if (!etatExcel) return 'operationnel';
    const e = String(etatExcel).toLowerCase();
    if (e.includes('restitue')) return 'restitue';
    if (e.includes('reparation') || e.includes('reparation')) return 'en_reparation';
    if (e.includes('panne')) return 'en_panne';
    if (e.includes('repare') || e.includes('repare')) return 'repare';
    if (e.includes('inactif')) return 'inactif';
    return 'operationnel';
}

function parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString();
    if (typeof dateStr === 'number') {
        const date = new Date((dateStr - 25569) * 86400 * 1000);
        return date.toISOString();
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]).toISOString();
    }
    return new Date(dateStr).toISOString();
}

// --- Export ---
function exporterExcel() {
    const wsClients = XLSX.utils.json_to_sheet(state.clients.map(c => ({
        'Code Client': c.codeClient,
        'Raison Sociale': c.raisonSociale,
        'District': c.district,
        'Entite Commerciale': c.entiteCommerciale,
        'Wilaya': c.wilaya,
        'Commune': c.commune,
        'Adresse': c.adresse,
        'Type Attribution': c.typeAttribution
    })));

    const wsEquipements = XLSX.utils.json_to_sheet(state.equipements.map(e => {
        const client = state.clients.find(c => c.id === e.clientId);
        return {
            'N Serie': e.numeroSerie,
            'Type': e.type,
            'Marque': e.marque,
            'Modele': e.modele,
            'Client': client ? client.raisonSociale : '',
            'Code Client': client ? client.codeClient : '',
            'E‰tat': getEtatLabel(e.etat)
        };
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsClients, 'Clients');
    XLSX.utils.book_append_sheet(wb, wsEquipements, 'Equipements');

    XLSX.writeFile(wb, `SGC-MineGesty_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('Export Excel telecharge', 'success');
}

function exporterJSON() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        clients: state.clients,
        equipements: state.equipements,
        cartes: state.cartes,
        config: state.config
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Format: YYYY-MM-DD_HH-MM-SS
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    a.download = `SGC-MineGesty_Backup_${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Sauvegarde JSON telechargee', 'success');
}

function exporterRapport() {
    let html = `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>Rapport SGC-MineGesty</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;}table{width:100%;border-collapse:collapse;margin:20px 0;}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f4f4f4;}
        h1{color:#6366f1;}h2{margin-top:30px;}</style></head><body>
        <h1>Rapport SGC-MineGesty</h1>
        <p>Genere le ${new Date().toLocaleString('fr-FR')}</p>
        <h2>Resume</h2>
        <ul>
            <li>Total Clients: ${state.clients.length}</li>
            <li>Total E‰quipements: ${state.equipements.length}</li>
            <li>Operationnels: ${state.equipements.filter(e => e.etat === 'operationnel').length}</li>
            <li>En Panne: ${state.equipements.filter(e => e.etat === 'en_panne').length}</li>
            <li>En Reparation: ${state.equipements.filter(e => e.etat === 'en_reparation').length}</li>
        </ul>
        <h2>Liste des E‰quipements</h2>
        <table><tr><th>N Serie</th><th>Type</th><th>Marque</th><th>Client</th><th>E‰tat</th></tr>
        ${state.equipements.map(e => {
        const c = state.clients.find(c => c.id === e.clientId);
        return `<tr><td>${e.numeroSerie}</td><td>${e.type}</td><td>${e.marque || '-'}</td><td>${c ? c.raisonSociale : '-'}</td><td>${getEtatLabel(e.etat)}</td></tr>`;
    }).join('')}
        </table></body></html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapport_SGC-MineGesty_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Rapport telecharge', 'success');
}

// --- Configuration ---
function rafraichirConfig() {
    // E‰tats
    document.getElementById('listeEtats').innerHTML = state.config.etatsEquipement.map(e => `
        <div class="config-item">
            <span>${e.label}</span>
            <i class="fas fa-times delete" onclick="supprimerConfig('etatsEquipement', '${e.id}')"></i>
        </div>
    `).join('');

    // Attributions
    document.getElementById('listeAttributions').innerHTML = state.config.typesAttribution.map(t => `
        <div class="config-item">
            <span>${t}</span>
            <i class="fas fa-times delete" onclick="supprimerConfig('typesAttribution', '${t}')"></i>
        </div>
    `).join('');

    // Marques
    document.getElementById('listeMarques').innerHTML = state.config.marques.map(m => `
        <div class="config-item">
            <span>${m}</span>
            <i class="fas fa-times delete" onclick="supprimerConfig('marques', '${m}')"></i>
        </div>
    `).join('');
}

function ajouterEtat() {
    const label = prompt('Nom du nouvel etat:');
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    state.config.etatsEquipement.push({ id, label, color: 'secondary' });
    sauvegarderVersLocalStorage();
    rafraichirConfig();
    toast('E‰tat ajoute', 'success');
}

function ajouterAttribution() {
    const type = prompt('Nouveau type d\'attribution:');
    if (!type) return;
    state.config.typesAttribution.push(type);
    sauvegarderVersLocalStorage();
    rafraichirConfig();
    toast('Type ajoute', 'success');
}

function ajouterMarque() {
    const marque = prompt('Nouvelle marque:');
    if (!marque) return;
    state.config.marques.push(marque);
    sauvegarderVersLocalStorage();
    rafraichirConfig();
    initialiserSelects();
    toast('Marque ajoutee', 'success');
}

function supprimerConfig(type, valeur) {
    if (!confirm('Supprimer cet element ?')) return;
    if (type === 'etatsEquipement') {
        state.config.etatsEquipement = state.config.etatsEquipement.filter(e => e.id !== valeur);
    } else {
        state.config[type] = state.config[type].filter(v => v !== valeur);
    }
    sauvegarderVersLocalStorage();
    rafraichirConfig();
    toast('E‰lement supprime', 'success');
}

// --- Champs Dynamiques ---
function rafraichirChampsDynamiques() {
    ['clients', 'equipements'].forEach(cat => {
        const container = document.getElementById(`champs${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
        container.innerHTML = state.config.customFields[cat].map(field => `
            <div class="champ-item">
                <div class="champ-info">
                    <strong>${field.nom}</strong>
                    <span class="champ-type">${field.type}</span>
                </div>
                <button class="btn-secondary btn-sm btn-danger" onclick="supprimerChamp('${cat}', '${field.nom}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('') || '<p style="color:var(--text-secondary);">Aucun champ personnalise</p>';
    });
}

function ajouterChampClient() {
    document.getElementById('champCategorie').value = 'clients';
    document.getElementById('formChamp').reset();
    ouvrirModal('modalChamp');
}

function ajouterChampEquipement() {
    document.getElementById('champCategorie').value = 'equipements';
    document.getElementById('formChamp').reset();
    ouvrirModal('modalChamp');
}

document.getElementById('champType')?.addEventListener('change', function () {
    document.getElementById('champOptionsGroup').style.display = this.value === 'select' ? 'block' : 'none';
});

function sauvegarderChamp(e) {
    e.preventDefault();

    const categorie = document.getElementById('champCategorie').value;
    const champ = {
        nom: document.getElementById('champNom').value.replace(/\s+/g, '_'),
        type: document.getElementById('champType').value,
        options: document.getElementById('champOptions').value.split(',').map(o => o.trim()).filter(Boolean)
    };

    if (state.config.customFields[categorie].some(f => f.nom === champ.nom)) {
        toast('Ce champ existe dejE ', 'error');
        return;
    }

    state.config.customFields[categorie].push(champ);
    sauvegarderVersLocalStorage();
    fermerModal('modalChamp');
    rafraichirChampsDynamiques();
    toast('Champ ajoute', 'success');
}

function supprimerChamp(categorie, nom) {
    if (!confirm('Supprimer ce champ ?')) return;
    state.config.customFields[categorie] = state.config.customFields[categorie].filter(f => f.nom !== nom);
    sauvegarderVersLocalStorage();
    rafraichirChampsDynamiques();
    toast('Champ supprime', 'success');
}

function genererChampsDynamiques(categorie, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = state.config.customFields[categorie].map(field => {
        let input = '';
        switch (field.type) {
            case 'text':
                input = `<input type="text" id="custom_${field.nom}">`;
                break;
            case 'number':
                input = `<input type="number" id="custom_${field.nom}">`;
                break;
            case 'date':
                input = `<input type="date" id="custom_${field.nom}">`;
                break;
            case 'checkbox':
                input = `<input type="checkbox" id="custom_${field.nom}">`;
                break;
            case 'select':
                input = `<select id="custom_${field.nom}">
                    <option value="">-- Selectionner --</option>
                    ${field.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>`;
                break;
        }
        return `<div class="form-group"><label>${field.nom.replace(/_/g, ' ')}</label>${input}</div>`;
    }).join('');
}

// --- Utilitaires ---
function genererID() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function ouvrirModal(id) {
    document.getElementById(id).classList.add('active');
}

function fermerModal(id) {
    document.getElementById(id).classList.remove('active');
}

function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function sauvegarderDonnees() {
    if (sauvegarderVersLocalStorage()) {
        toast('Donnees sauvegardees localement', 'success');
        exporterJSON();
    } else {
        toast('Erreur de sauvegarde', 'error');
    }
}

function chargerDonnees() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.clients) state.clients = data.clients;
                if (data.equipements) state.equipements = data.equipements;
                if (data.cartes) state.cartes = data.cartes;
                if (data.config) state.config = { ...CONFIG_DEFAULT, ...data.config };

                sauvegarderVersLocalStorage();
                rafraichirDashboard();
                toast('Donnees chargees', 'success');
            } catch (err) {
                toast('Erreur de lecture JSON', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function rafraichir() {
    chargerDepuisLocalStorage();
    afficherVue(state.vueActive);
    toast('Vue rafraichie', 'info');
}

function rechercheGlobale() {
    const terme = document.getElementById('globalSearch').value.toLowerCase();
    if (terme.length < 2) return;

    // Recherche dans clients
    const clientsResultats = state.clients.filter(c =>
        (c.codeClient && c.codeClient.toLowerCase().includes(terme)) ||
        (c.raisonSociale && c.raisonSociale.toLowerCase().includes(terme)) ||
        (c.wilaya && c.wilaya.toLowerCase().includes(terme))
    );

    // Recherche dans equipements
    const equipResultats = state.equipements.filter(e =>
        (e.numeroSerie && e.numeroSerie.toLowerCase().includes(terme)) ||
        (e.marque && e.marque.toLowerCase().includes(terme))
    );

    // Recherche dans reclamations
    const reclamResultats = (state.reclamations || []).filter(r =>
        (r.numero && r.numero.toLowerCase().includes(terme)) ||
        (r.objet && r.objet.toLowerCase().includes(terme))
    );

    // Afficher en fonction des resultats
    if (equipResultats.length > 0) {
        afficherVue('equipements');
        const tbody = document.querySelector('#tableEquipements tbody');
        tbody.innerHTML = '';
        equipResultats.forEach(eq => afficherLigneEquipement(eq, tbody));
        toast(`${equipResultats.length} equipement(s) trouve(s)`, 'info');
    } else if (clientsResultats.length > 0) {
        afficherVue('clients');
        const tbody = document.querySelector('#tableClients tbody');
        tbody.innerHTML = '';
        clientsResultats.forEach(client => {
            const nbEquip = state.equipements.filter(e => e.clientId === client.id).length;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${client.codeClient || ''}</strong></td>
                <td>${client.raisonSociale || ''}</td>
                <td>${client.wilaya || '-'}</td>
                <td>${client.district || '-'}</td>
                <td>${client.typeAttribution || '-'}</td>
                <td><span class="badge badge-info">${nbEquip}</span></td>
                <td class="actions">
                    <button class="btn-secondary btn-sm" onclick="editerClient('${client.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary btn-sm" onclick="voirEquipementsClient('${client.id}')"><i class="fas fa-terminal"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        toast(`${clientsResultats.length} client(s) trouve(s)`, 'info');
    } else if (reclamResultats.length > 0) {
        afficherVue('reclamations');
        toast(`${reclamResultats.length} reclamation(s) trouvee(s)`, 'info');
    } else {
        toast('Aucun resultat trouve', 'warning');
    }
}
