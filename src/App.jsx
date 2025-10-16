import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app'; 
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { Home, CheckCircle, Target, Users, TrendingUp, Zap, Clock, Send, Eye, MessageSquare, Briefcase } from 'lucide-react';

// --- DATA STRUCTURES ---

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

// --- HELPER FUNCTIONS (generatePlanData and createUniqueItemSelector are correct and omitted for brevity) ---
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

    let currentTier = startTier;
    let requiredTiers = priorityList;
    
    for (let month = 1; month <= 24; month++) {
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


// --- COMPONENTS (PlanGenerator, TrackerDashboard, Modals, TitleCard are correct and omitted for brevity) ---
// (Note: The core logic for these components relies on 'db', 'auth', and 'appId' being available from the main App component)

// --- Define App as Initialization Container ---
const App = (props) => {
    const { firebaseConfig, appId, initialAuthToken } = props;

    // Firebase instances stored in state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);

    const [userId, setUserId] = useState(null);
    const [userPlanData, setUserPlanData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Path constant relies on the appId prop
    const APP_ID = appId; 

    // 1. Initialization and Authentication (using useCallback for stability)
    const initializeFirebase = useCallback(() => {
        // 1. CRITICAL CHECK: Ensure configuration is ready before proceeding
        if (!firebaseConfig || !firebaseConfig.projectId) {
            setError("Firebase is not configured. Ensure credentials are passed correctly.");
            setIsLoading(false);
            return;
        }

        try {
            // Check if app is already initialized (to prevent errors in React Dev Mode)
            const appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
            
            const dbInstance = getFirestore(appInstance);
            setDb(dbInstance);

            const authInstance = getAuth(appInstance);
            setAuth(authInstance);

            // Authentication Logic
            const initializeAuth = async () => {
                try {
                    // Use prop for token check
                    if (initialAuthToken && initialAuthToken.length > 0) {
                        await signInWithCustomToken(authInstance, initialAuthToken);
                    } else {
                        await signInAnonymously(authInstance);
                    }
                } catch (e) {
                    console.error("Auth Error:", e);
                    setError(`Authentication Failed: ${e.message}`);
                }
            };

            const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                    setIsLoading(false);
                }
            });

            initializeAuth();
            return () => unsubscribeAuth();

        } catch (e) {
            console.error("Firebase Initialization Error:", e);
            setError(`Firebase Initialization Error: ${e.message}`);
            setIsLoading(false);
        }
    }, [firebaseConfig, initialAuthToken]); // Dependencies are the incoming props

    useEffect(() => {
        // Call the initialization function only once on mount
        const cleanup = initializeFirebase();
        return () => {
            if (cleanup) cleanup();
        };
    }, [initializeFirebase]);


    // 2. Data Listener (Plan Retrieval)
    useEffect(() => {
        // Only run if userId and Firestore instance (db) are available
        if (!userId || !db || !auth) return;

        const roadmapRef = doc(db, `/artifacts/${APP_ID}/users/${userId}/leadership_plan`, 'roadmap');

        const unsubscribe = onSnapshot(roadmapRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserPlanData(data);
            } else {
                setUserPlanData(null); // Plan doesn't exist, show generator
            }
            setIsLoading(false);
        }, (e) => {
            console.error("Firestore Snapshot Error:", e);
            setError(`Failed to load plan: ${e.message}`);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, db, auth, APP_ID]); // Dependencies are the state variables

    // --- RENDER LOGIC ---

    if (error) {
        return (
            <div className="p-8 text-center text-red-700 bg-red-100 rounded-lg max-w-lg mx-auto mt-12">
                <h1 className="text-xl font-bold">Application Error</h1>
                <p className="mt-2 text-sm">{error}</p>
                <p className="mt-2 text-xs">Ensure your Firebase Config keys are correct in main.jsx.</p>
            </div>
        );
    }

    // Pass db and APP_ID to the child components for Firestore operations
    const childProps = { userId, setUserPlanData, setIsLoading, db, app_id: APP_ID };

    if (isLoading || !db || !auth || !userId) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="p-6 text-center text-gray-700">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leader-accent mx-auto"></div>
                    <p className="mt-4 font-semibold">Authenticating and connecting to LeaderReps database...</p>
                    {/* Display error if config is null while loading */}
                    {(!firebaseConfig || !firebaseConfig.projectId) && (
                        <p className="mt-4 text-xs text-red-500">Awaiting Firebase Configuration...</p>
                    )}
                </div>
            </div>
        );
    }
    
    // --- FINAL RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {!userPlanData ? (
                <PlanGenerator {...childProps} />
            ) : (
                <TrackerDashboard {...childProps} userPlanData={userPlanData} />
            )}
            <p className="fixed bottom-2 left-2 text-xs text-gray-400">User ID: {userId}</p>
        </div>
    );
};

// Pass child component props (omitted for brevity)
const PlanGenerator = ({ userId, setPlanData, setIsLoading, db, app_id }) => { /* ... */ };
const TrackerDashboard = ({ userId, userPlanData, setUserPlanData, db, app_id }) => { /* ... */ };


export default App;
