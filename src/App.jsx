import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { Home, CheckCircle, Target, Users, TrendingUp, Zap, Clock, Send, Eye, MessageSquare, Briefcase } from 'lucide-react';

// --- DATA STRUCTURES (Your Project Constants) ---
// 5 Tiers of Leadership (from New Manager to Seasoned Leader)
const LEADERSHIP_TIERS = [
    { id: 1, title: "Self-Awareness & Management", icon: Eye, description: "Mastering your own strengths, motivations, and resilience (Tier 1)." },
    { id: 2, title: "People & Coaching", icon: Users, description: "Giving effective feedback and developing direct reports (Tier 2)." },
    { id: 3, title: "Execution & Accountability", icon: CheckCircle, description: "Delegating effectively and driving clear results (Tier 3)." },
    { id: 4, title: "Communication & Vision", icon: Target, description: "Translating strategy into inspiring, actionable goals (Tier 4)." },
    { id: 5, title: "Talent & Culture", icon: Briefcase, description: "Building high-performing teams and shaping culture (Tier 5)." },
];

// Content Library (The Playground Resources)
const SAMPLE_CONTENT_LIBRARY = [
    // TIER 1: Self-Awareness
    { id: 'c1', tier: 1, skill: "EQ", title: "Video: Mastering Your Focus Word", type: "Video", duration: 10, url: "#" },
    { id: 'c2', tier: 1, skill: "Self-Management", title: "Template: The Time-Audit Rep", type: "Template", duration: 20, url: "#" },
    // TIER 2: Feedback & Coaching (QuickStart Core)
    { id: 'c3', tier: 2, skill: "Feedback", title: "Micro-Challenge: Practice the CLEAR Framework", type: "Micro-Challenge", duration: 15, url: "#" },
    { id: 'c4', tier: 2, skill: "Coaching", title: "Template: Effective 1:1 Agenda (Based on Direct's Agenda)", type: "Template", duration: 5, url: "#" },
    { id: 'c5', tier: 2, skill: "Feedback", title: "Reading: The 5:1 Magic Ratio Explained", type: "Reading", duration: 10, url: "#" },
    // TIER 3: Execution & Accountability
    { id: 'c6', tier: 3, skill: "Delegation", title: "Case Study: Delegating vs. Dumping", type: "Case Study", duration: 25, url: "#" },
    { id: 'c7', tier: 3, skill: "Accountability", title: "Worksheet: Setting CLEAR KPIs", type: "Template", duration: 20, url: "#" },
    // TIER 4: Communication & Vision
    { id: 'c8', tier: 4, skill: "Vision", title: "Micro-Challenge: Write Your Team's 6-Month Vision", type: "Micro-Challenge", duration: 45, url: "#" },
    { id: 'c9', tier: 4, skill: "Communication", title: "Video: Leading Change Management with Empathy", type: "Video", duration: 15, url: "#" },
    // TIER 5: Talent & Culture (QuickStart Core)
    { id: 'c10', tier: 5, skill: "Trust", title: "Reading: Lencioni's 5 Dysfunctions of a Team Summary", type: "Reading", duration: 10, url: "#" },
    { id: 'c11', tier: 5, skill: "Culture", title: "Template: Talent Audit and Succession Planning", type: "Template", duration: 30, url: "#" },
];

// Reflection Prompts based on QuickStart Workbook
const REFLECTION_PROMPTS = {
    1: "Session 1: Which of the 5 Rules for Feedback do you struggle with the most, and what's your plan to hit the 5:1 Magic Ratio?",
    4: "Session 4: Reflect on vulnerability. Where have you struggled to lead with vulnerability, and what action will you commit to next?",
    3: "Session 3: What's working well in your 1:1s, and what challenge are you facing with your direct's agenda?",
    5: "Session 2: Reflect on your Leadership Identity Statement (LIS). What is your focus word, and how will it anchor your behavior this month?",
};

// --- HELPER FUNCTIONS ---

/**
 * Returns a function to add a unique item from a source array.
 */
const createUniqueItemSelector = (tierList) => {
    const selectedIds = new Set();
    const allContentIds = SAMPLE_CONTENT_LIBRARY.map(c => c.id);

    const prioritizedContent = SAMPLE_CONTENT_LIBRARY.filter(c => tierList.includes(c.tier));
    const secondaryContent = SAMPLE_CONTENT_LIBRARY.filter(c => !tierList.includes(c.tier));

    const pool = [...prioritizedContent, ...secondaryContent];

    const addUniqueItem = () => {
        for (let item of pool) {
            if (!selectedIds.has(item.id)) {
                selectedIds.add(item.id);
                return item.id;
            }
        }
        for (let id of allContentIds) {
            if (!selectedIds.has(id)) {
                selectedIds.add(id);
                return id;
            }
        }
        return null;
    };
    return addUniqueItem;
};


/**
 * Generates the 24-month personalized plan based on user assessment.
 */
const generatePlanData = (assessment) => {
    const { managerStatus, goalPriorities, tierSelfRating } = assessment;

    let startTier;
    switch (managerStatus) {
        case 'New Manager': startTier = 1; break;
        case 'Mid-Level Leader': startTier = 3; break;
        case 'Seasoned Leader': startTier = 4; break;
        default: startTier = 1;
    }

    const sortedRatings = Object.entries(tierSelfRating)
        .sort(([, a], [, b]) => a - b)
        .map(([tierId]) => parseInt(tierId));

    const priorityList = Array.from(new Set([...goalPriorities, ...sortedRatings]));
    
    const plan = [];
    let currentTierIndex = priorityList.findIndex(tier => tier === startTier);
    if (currentTierIndex === -1) currentTierIndex = 0;

    let requiredTiers = priorityList;
    
    for (let month = 1; month <= 24; month++) {
        let currentTier = requiredTiers[currentTierIndex];

        if ((month - 1) % 4 === 0 && month > 1) {
            currentTierIndex = (currentTierIndex + 1) % requiredTiers.length;
            currentTier = requiredTiers[currentTierIndex];
        } else if (month === 1) {
            currentTier = startTier;
        }

        const contentSelector = createUniqueItemSelector(requiredTiers);
        
        const requiredContentIds = [];
        for (let i = 0; i < 4; i++) {
            const itemId = contentSelector();
            if (itemId) requiredContentIds.push(itemId);
        }

        const tierData = LEADERSHIP_TIERS.find(t => t.id === currentTier);
        const themeIndex = (month - 1) % 4;

        plan.push({
            id: `m${month}`,
            month: month,
            tier: currentTier,
            theme: `${tierData.title}: Focus Rep ${themeIndex + 1}`,
            requiredContentIds: requiredContentIds,
            status: 'To Do',
            reflectionText: null,
        });
    }

    return plan;
};


// --- COMPONENTS (Removed for Brevity in Final Debug) ---

const TitleCard = ({ title, description, icon: Icon, color = 'leader-blue' }) => ( /* ... component code ... */ <div className={`p-6 bg-white shadow-xl rounded-xl border-t-4 border-${color}`}>
        <div className="flex items-center space-x-4">
            <Icon className={`w-8 h-8 text-${color}`} />
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        </div>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
);

const ReflectionModal = ({ isOpen, monthData, reflectionInput, setReflectionInput, onSubmit, onClose }) => { /* ... component code ... */ return isOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-50"></div></div> : null; };
const ScenarioModal = ({ isOpen, scenarioInput, setScenarioInput, onSubmit, onClose }) => { /* ... component code ... */ return isOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-50"></div></div> : null; };
const PlanGenerator = ({ userId, setPlanData, setIsLoading }) => { /* ... component code ... */ return <div className="p-8 max-w-5xl mx-auto"><TitleCard title="1:1 Plan Generator: Your LeaderReps Roadmap" description={`Welcome, ${userId}. Let's design your custom 24-month professional development plan based on the 4-session QuickStart course.`} icon={Zap} color="leader-accent" /></div>; };
const TrackerDashboard = ({ userId, userPlanData, setUserPlanData }) => { /* ... component code ... */ return <div className="p-8 max-w-6xl mx-auto"><TitleCard title="Your LeaderReps Tracker Dashboard" description={`Welcome, ${userId}. Track your progress through the 24-Month Playground Roadmap.`} icon={Home} color="leader-blue" /></div>; };


// --- GLOBAL VARIABLES (Must be defined outside component) ---
// These are placeholders for the services which will be defined inside App.
let app, db, auth;
const appId = "leaderreps-pd-plan"; // Fixed based on project ID

// --- MAIN APPLICATION COMPONENT (Now receives config as props) ---
const App = ({ firebaseConfig, initialAuthToken }) => {
    const [userId, setUserId] = useState(null);
    const [userPlanData, setUserPlanData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Final, robust Firebase Initialization
    useEffect(() => {
        if (!firebaseConfig || !firebaseConfig.projectId) {
            setError("Firebase is not configured. Ensure credentials are passed correctly.");
            setIsLoading(false);
            return;
        }

        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
        } catch (e) {
            // Check if app already initialized (common in React Strict Mode)
            if (e.code !== 'app/duplicate-app') {
                console.error("Critical Firebase Init Error:", e);
                setError("Critical Initialization Error. Check console.");
                setIsLoading(false);
                return;
            }
        }
        
        const currentAuth = getAuth(app);

        const initializeAuth = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(currentAuth, initialAuthToken);
                } else {
                    await signInAnonymously(currentAuth);
                }
            } catch (e) {
                console.error("Auth Error:", e);
                setError(`Authentication Failed: ${e.message}`);
            }
        };

        const unsubscribe = onAuthStateChanged(currentAuth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
            }
            setIsLoading(false);
        });

        initializeAuth();
        return () => unsubscribe();
    }, [firebaseConfig, initialAuthToken]); // Re-run if config changes

    // Data Listener (Plan Retrieval)
    useEffect(() => {
        if (!userId || !db) return;

        // Plan reference must be defined here, inside useEffect, to ensure db and userId are initialized
        const planRef = doc(db, `/artifacts/${appId}/users/${userId}/leadership_plan`, 'roadmap');

        const unsubscribe = onSnapshot(planRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserPlanData(data);
            } else {
                setUserPlanData(null);
            }
        }, (e) => {
            // This is the permissions error we saw earlier
            if (e.code === 'permission-denied') {
                setError("Application Error: Failed to load plan: Missing or insufficient permissions. Ensure your Firestore Security Rules are correct.");
            } else {
                console.error("Firestore Snapshot Error:", e);
                setError(`Failed to load plan: ${e.message}`);
            }
        });

        return () => unsubscribe();
    }, [userId]);


    if (error) {
        return (
            <div className="p-8 text-center text-red-700 bg-red-100 rounded-lg max-w-lg mx-auto mt-12">
                <h1 className="text-xl font-bold">Application Error</h1>
                <p className="mt-2 text-sm">{error}</p>
            </div>
        );
    }

    if (isLoading || !userId) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="p-6 text-center text-gray-700">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leader-accent mx-auto"></div>
                    <p className="mt-4 font-semibold">Authenticating and loading LeaderReps data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {!userPlanData ? (
                <PlanGenerator userId={userId} setPlanData={setUserPlanData} setIsLoading={setIsLoading} />
            ) : (
                <TrackerDashboard userId={userId} userPlanData={userPlanData} setUserPlanData={setUserPlanData} />
            )}
            <p className="fixed bottom-2 left-2 text-xs text-gray-400">User ID: {userId}</p>
        </div>
    );
};

export default App;