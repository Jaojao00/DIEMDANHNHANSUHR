const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDMNXAQiU27NbYm217RjkGt_0OOYVnFGWM",
  authDomain: "caigidonha.firebaseapp.com",
  projectId: "caigidonha",
  storageBucket: "caigidonha.firebasestorage.app",
  messagingSenderId: "616964012819",
  appId: "1:616964012819:web:5dd98d3e265f86dadd78e6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migratePeriods() {
    console.log("Starting migration for periods...");
    const regRef = collection(db, "periods");
    const snapshot = await getDocs(regRef);
    console.log(`Found ${snapshot.size} documents.`);

    let count = 0;
    const batch = writeBatch(db);

    snapshot.forEach(document => {
        const data = document.data();
        let needsUpdate = false;
        let updatePayload = {};

        // Fix name
        if (typeof data.name === "string") {
            let newName = data.name;
            if (newName.includes("06:00-10:00")) newName = newName.replace("06:00-10:00", "06:00-11:00");
            if (newName.includes("15:00-22:00")) newName = newName.replace("15:00-22:00", "13:00-22:00");
            if (newName !== data.name) {
                updatePayload.name = newName;
                needsUpdate = true;
            }
        }

        // Fix shiftId
        if (data.shiftId === "06:00-10:00") {
            updatePayload.shiftId = "06:00-11:00";
            needsUpdate = true;
        } else if (data.shiftId === "15:00-22:00") {
            updatePayload.shiftId = "13:00-22:00";
            needsUpdate = true;
        }

        // Fix schedule items
        if (data.schedule && Array.isArray(data.schedule)) {
            let scheduleChanged = false;
            const newSchedule = data.schedule.map(emp => {
                let empChanged = false;
                let newEmp = { ...emp };
                if (newEmp.shiftId === "06:00-10:00") {
                    newEmp.shiftId = "06:00-11:00";
                    newEmp.shiftLabel = "Ca Sáng";
                    empChanged = true;
                } else if (newEmp.shiftId === "15:00-22:00") {
                    newEmp.shiftId = "13:00-22:00";
                    newEmp.shiftLabel = "Ca Chiều";
                    empChanged = true;
                }

                if (newEmp.selections && Array.isArray(newEmp.selections)) {
                    const newSelections = newEmp.selections.map(sel => {
                        if (sel.choice === "06:00-10:00") {
                            empChanged = true;
                            return { ...sel, choice: "06:00-11:00" };
                        }
                        if (sel.choice === "15:00-22:00") {
                            empChanged = true;
                            return { ...sel, choice: "13:00-22:00" };
                        }
                        return sel;
                    });
                    newEmp.selections = newSelections;
                }

                if (newEmp.choices && Array.isArray(newEmp.choices)) {
                     const newChoices = newEmp.choices.map(choice => {
                         if (choice === "06:00-10:00") { empChanged = true; return "06:00-11:00"; }
                         if (choice === "15:00-22:00") { empChanged = true; return "13:00-22:00"; }
                         return choice;
                     });
                     newEmp.choices = newChoices;
                }
                
                if (empChanged) scheduleChanged = true;
                return newEmp;
            });
            if (scheduleChanged) {
                updatePayload.schedule = newSchedule;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log(`Updating period doc ${document.id}`);
            batch.update(document.ref, updatePayload);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully updated ${count} period documents.`);
    } else {
        console.log("No period documents needed updating.");
    }
}

migratePeriods().catch(console.error);
