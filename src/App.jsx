import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { Home, CheckCircle, Target, Users, TrendingUp, Zap, Clock, Send, Eye, MessageSquare, Briefcase } from 'lucide-react';

// --- DATA STRUCTURES (Your Project Constants) ---
const LEADERSHIP_TIERS = [
    { id: 1, title: "Self-Awareness & Management", icon: Eye, description: "Mastering your own strengths, motivations, and resilience (Tier 1)." },
    { id: 2, title: "People & Coaching", icon: Users, description: "Giving effective feedback and developing direct reports (Tier 2)." },
    { id: 3, title: "Execution & Accountability", icon: CheckCircle, description: "Delegating effectively and driving clear results (Tier 3)." },
    { id: 4, title: "Communication & Vision", icon: Target, description: "Translating strategy into inspiring, actionable goals (Tier 4)." },
    { id: 5, title: "Talent & Culture", icon: Briefcase, description: "Building high-performing teams and shaping culture (Tier 5)." },
];

const SAMPLE_CONTENT_LIBRARY = [
    { id: 'c1', tier: 1, skill: "EQ", title: "Video: Mastering Your Focus Word", type: "Video", duration: 10, url: "#" },
    { id: 'c2', tier: 1, skill: "Self-Management", title: "Template: The Time-Audit Rep", type: "Template", duration: 20, url: "#" },
    { id: 'c3', tier: 2, skill: "Feedback", title: "Micro-Challenge: Practice the CLEAR Framework", type: "Micro-Challenge", duration: 15, url: "#" },
    { id: 'c4', tier: 2, skill: "Coaching", title: "Template: Effective 1:1 Agenda (Based on Direct's Agenda)", type: "Template", duration: 5, url: "#" },
    { id: 'c5', tier: 2, skill: "Feedback", title: "Reading: The 5:1 Magic Ratio Explained", type: "Reading", duration: 10, url: "#" },
    { id: 'c6', tier: 3, skill: "Delegation", title: "Case Study: Delegating vs. Dumping", type: "Case Study", duration: 25, url: "#" },
    { id: 'c7', tier: 3, skill: "Accountability", title: "Worksheet: Setting CLEAR KPIs", type: "Template", duration: 20, url: "#" },
    { id: 'c8', tier: 4, skill: "Vision", title: "Micro-Challenge: Write Your Team's 6-Month Vision", type: "Micro-Challenge", duration: 45, url: "#" },
    { id: 'c9', tier: 4, skill: "Communication", title: "Video: Leading Change Management with Empathy", type: "Video", duration: 15, url: "#" },
    { id: 'c10', tier: 5, skill: "Trust", title: "Reading: Lencioni's 5 Dysfunctions of a Team Summary", type: "Reading", duration: 10, url: "#" },
    { id: 'c11', tier: 5, skill: "Culture", title: "Template: Talent Audit and Succession Planning", type: "Template", duration: 30, url: "#" },
];

const REFLECTION_PROMPTS = {
    1: "Session 1: Which of the 5 Rules for Feedback do you struggle with the most, and what's your plan to hit the 5:1 Magic Ratio?",
    4: "Session 4: Reflect on vulnerability. Where have you struggled to lead with vulnerability, and what action will you commit to next?",
    3: "Session 3: What's working well in your 1:1s, and what challenge are you facing with your direct's agenda?",
    5: "Session 2: Reflect on your Leadership Identity Statement (LIS). What is your focus word, and how will it anchor your behavior this month?",
};

// --- HELPER FUNCTIONS ---
const createUniqueItemSelector = (tierList) => { /* ... logic ... */ return () => 'c1'; };
const generatePlanData = (assessment) => { /* ... logic ... */ return [{ id: 'm1', month: 1, tier: 2, theme: 'Example Theme', requiredContentIds: ['c3', 'c4', 'c5'] }]; }; 


// --- GLOBAL SERVICE VARIABLES (Must be outside component) ---
let app, db, auth;
const APP_ID = "leaderreps-pd-plan"; // Fixed project ID


// --- COMPONENTS (Placeholders for brevity) ---
const TitleCard = ({ title, description, icon: Icon, color = 'leader-blue' }) => ( /* ... component code ... */ <div className={`p-6 bg-white shadow-xl rounded-xl border-t-4 border-${color}`}><h2 className="text-2xl font-bold text-gray-800">{title}</h2></div>);
const ReflectionModal = ({ isOpen, monthData, reflectionInput, setReflectionInput, onSubmit, onClose }) => { /* ... component code ... */ return isOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">Modal Content</div> : null; };
const ScenarioModal = ({ isOpen, scenarioInput, setScenarioInput, onSubmit, onClose }) => { /* ... component code ... */ return isOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">Modal Content</div> : null; };
const PlanGenerator = ({ userId, setPlanData, setIsLoading }) => { /* ... component code ... */ return <div className="p-8 max-w-5xl mx-auto"><TitleCard title="1:1 Plan Generator: Your LeaderReps Roadmap" description={`Welcome, ${userId}. Let's design your custom 24-month professional development plan based on the 4-session QuickStart course.`} icon={Zap} color="leader-accent" /></div>; };
const TrackerDashboard = ({ userId, userPlanData, setUserPlanData }) => { /* ... component code ... */ return <div className="p-8 max-w-6xl mx-auto"><TitleCard title="Your LeaderReps Tracker Dashboard" description={`Welcome, ${userId}. Track your progress through the 24-Month Playground Roadmap.`} icon={Home} color="leader-blue" /></div>; };


// --- MAIN APPLICATION COMPONENT ---
const App = ({ firebaseConfig, appId, initialAuthToken }) => {
    const [userId, setUserId] = useState(null);
    const [userPlanData, setUserPlanData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);


    // 1. Initialization (Runs once when config is available)
    useEffect(() => {
        if (isInitialized) return;

        if (!firebaseConfig || !firebaseConfig.projectId) {
            setError("Firebase is not configured. Ensure credentials are passed correctly.");
            setIsLoading(false);
            return;
        }

        try {
            // Initialize services only once
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            setIsInitialized(true); // Mark initialization complete

            // Proceed with Auth after successful service setup
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
            
            // Safety net: Force the loading screen to disappear after 7 seconds
            const hangTimeout = setTimeout(() => {
                if (isLoading) {
                    setError("Authentication hang detected. Check Firestore rules or network.");
                    setIsLoading(false);
                }
            }, 7000); // 7 seconds timeout

            const unsubscribe = onAuthStateChanged(currentAuth, (user) => {
                clearTimeout(hangTimeout); // <--- THIS LINE STOPS THE HANG TIMER
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                }
                // We rely on the Plan Retrieval useEffect to manage the final isLoading state
            });

            initializeAuth();
            return () => {
                clearTimeout(hangTimeout);
                unsubscribe();
            };

        } catch (e) {
            if (e.code !== 'app/duplicate-app') {
                console.error("Critical Firebase Init Error:", e);
                setError(`Critical Initialization Error: ${e.message}`);
                setIsLoading(false);
            }
        }
    }, [firebaseConfig, initialAuthToken, isInitialized]);


    // 2. Data Listener (Plan Retrieval)
    useEffect(() => {
        if (!userId || !db || !isInitialized) return;

        // Plan reference must be defined here, inside useEffect, to ensure db and userId are initialized
        const planRef = doc(db, `/artifacts/${APP_ID}/users/${userId}/leadership_plan`, 'roadmap');

        const unsubscribe = onSnapshot(planRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserPlanData(data);
            } else {
                setUserPlanData(null); 
            }
            setIsLoading(false); // Authentication is complete, data check is done.
        }, (e) => {
            // Permissions error that we were seeing earlier
            if (e.code === 'permission-denied') {
                setError("Application Error: Failed to load plan: Missing or insufficient permissions. Ensure your Firestore Security Rules are correct.");
            } else {
                console.error("Firestore Snapshot Error:", e);
                setError(`Failed to load plan: ${e.message}`);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId, isInitialized]);


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