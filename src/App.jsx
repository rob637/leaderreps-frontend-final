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
  1: `Session 1: Which of the 5 Rules for Feedback do you struggle with the most, and what's your plan to hit the <strong>5:1 Magic Ratio</strong>?`,
  4: `Session 4: Reflect on vulnerability. Where have you struggled to lead with vulnerability, and what action will you commit to next?`,
  3: `Session 3: What's working well in your 1:1s, and what challenge are you facing with your direct's agenda?`,
  5: `Session 2: Reflect on your Leadership Identity Statement (LIS). What is your <strong>focus word</strong>, and how will it anchor your behavior this month?`,
};

// --- HELPER FUNCTIONS ---
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

  const requiredTiers = priorityList;
  let contentSelector = createUniqueItemSelector(requiredTiers);

  for (let month = 1; month <= 24; month++) {
    let currentTier = requiredTiers[currentTierIndex];

    if ((month - 1) % 4 === 0 && month > 1) {
      currentTierIndex = (currentTierIndex + 1) % requiredTiers.length;
      currentTier = requiredTiers[currentTierIndex];
    } else if (month === 1) {
      currentTier = startTier;
    }

    const requiredContentIds = [];
    for (let i = 0; i < 4; i++) {
      let itemId = contentSelector();
      if (!itemId) {
        contentSelector = createUniqueItemSelector(requiredTiers);
        itemId = contentSelector();
      }
      if (itemId) requiredContentIds.push(itemId);
    }

    const tierData = LEADERSHIP_TIERS.find(t => t.id === currentTier);
    const themeIndex = (month - 1) % 4;

    plan.push({
      id: `m${month}`,
      month,
      tier: currentTier,
      theme: `${tierData.title}: Focus Rep ${themeIndex + 1}`,
      requiredContentIds,
      status: 'To Do',
      reflectionText: null,
    });
  }

  return plan;
};

// --- GLOBAL/SHARED SERVICE APP ID ---
const APP_ID = "leaderreps-pd-plan"; // Fixed project ID

// --- COMPONENT SUB-MODULES (Defined outside App for valid React element type) ---
function TitleCard({ title, description, icon: Icon, color = 'leader-blue' }) {
  const palette = {
    'leader-blue': { border: 'border-leader-blue', text: 'text-leader-blue' },
    'leader-accent': { border: 'border-leader-accent', text: 'text-leader-accent' },
  };
  const { border, text } = palette[color] ?? palette['leader-blue'];

  return (
    <div className={`p-6 bg-white shadow-xl rounded-xl border-t-4 ${border}`}>
      <div className="flex items-center space-x-4">
        <Icon className={`w-8 h-8 ${text}`} />
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function ReflectionModal({ isOpen, monthData, reflectionInput, setReflectionInput, onSubmit, onClose }) {
  if (!isOpen || !monthData) return null;

  const promptKey = monthData.tier in REFLECTION_PROMPTS ? monthData.tier : 5;
  const prompt = REFLECTION_PROMPTS[promptKey] || REFLECTION_PROMPTS[5];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-50">
        <h3 className="text-xl font-bold text-leader-blue border-b pb-2 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-leader-accent" />
          Monthly Reflection: Month {monthData.month}
        </h3>
        <p className="text-sm font-semibold text-gray-700 mb-4">
          <strong>Workout Requirement:</strong> Please complete this reflection based on the QuickStart workbook before marking the month complete.
        </p>

        <p
          className="text-base italic p-3 bg-leader-light rounded-lg border border-leader-accent/50 text-gray-800 mb-4"
          dangerouslySetInnerHTML={{ __html: prompt }}
        />

        <textarea
          value={reflectionInput || ''}
          onChange={(e) => setReflectionInput(e.target.value)}
          placeholder="Type your reflection here. Be honest, clear is kind!"
          rows="6"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-leader-accent focus:border-leader-accent transition duration-150"
        ></textarea>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(monthData.month)}
            disabled={reflectionInput.length < 50}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${reflectionInput.length >= 50 ? 'bg-leader-accent hover:bg-orange-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Submit Reflection & Complete
          </button>
        </div>
        {reflectionInput.length < 50 && (
          <p className="text-xs text-red-500 mt-2 text-right">Reflection must be at least 50 characters.</p>
        )}
      </div>
    </div>
  );
}

function ScenarioModal({ isOpen, scenarioInput, setScenarioInput, onSubmit, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-50">
        <h3 className="text-xl font-bold text-leader-blue border-b pb-2 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-leader-accent" />
          Leaders Circle Prep: Scenario Submission
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          Briefly describe a situation in which you struggled to show up as your best leadership self, or describe an upcoming situation you are unsure about.
        </p>

        <textarea
          value={scenarioInput || ''}
          onChange={(e) => setScenarioInput(e.target.value)}
          placeholder="Describe your scenario here (e.g., 'A direct report challenged me using the Defender Persona after redirecting feedback...')."
          rows="8"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-leader-accent focus:border-leader-accent transition duration-150"
        ></textarea>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={scenarioInput.length < 50}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${scenarioInput.length >= 50 ? 'bg-leader-blue hover:bg-blue-800' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Submit Scenario for Review
          </button>
        </div>
        {scenarioInput.length < 50 && (
          <p className="text-xs text-red-500 mt-2 text-right">Scenario must be at least 50 characters.</p>
        )}
      </div>
    </div>
  );
}

// Plan Generator
function PlanGenerator({ userId, setPlanData, setIsLoading, db }) {
  const [status, setStatus] = useState('New Manager');
  const [goals, setGoals] = useState([]);
  const [ratings, setRatings] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const initialRatings = LEADERSHIP_TIERS.reduce((acc, tier) => {
      acc[tier.id] = 5;
      return acc;
    }, {});
    setRatings(initialRatings);
  }, []);

  const toggleGoal = (tierId) => {
    const newGoals = goals.includes(tierId)
      ? goals.filter(id => id !== tierId)
      : [...goals, tierId].slice(0, 3);
    setGoals(newGoals);
  };

  const handleGenerate = async () => {
    if (goals.length === 0) {
      setMessage("Please select at least one core leadership goal.");
      return;
    }

    setIsLoading(true);
    setMessage("Generating 24-month personalized plan...");

    const assessment = {
      managerStatus: status,
      goalPriorities: goals,
      tierSelfRating: ratings,
      initialAssessmentDate: new Date().toISOString(),
    };

    const plan = generatePlanData(assessment);
    const payload = { ownerUid: userId, assessment, plan, currentMonth: 1, lastUpdate: new Date().toISOString() };

    try {
      const planRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'leadership_plan', 'roadmap');
      await setDoc(planRef, payload);
      setPlanData(payload);
      setMessage("Success! Your 24-month roadmap is ready.");
    } catch (e) {
      console.error("Error creating plan:", e);
      setMessage(`Error saving plan: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isGenerateDisabled = goals.length === 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <TitleCard
        title="1:1 Plan Generator: Your LeaderReps Roadmap"
        description={`Welcome, ${userId}. Let's design your custom 24-month professional development plan based on the 4-session QuickStart course.`}
        icon={Zap}
        color="leader-accent"
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Status */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-leader-blue">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Select Your Current Status</h3>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-leader-accent focus:border-leader-accent"
          >
            <option value="New Manager">New Manager (0-18 months)</option>
            <option value="Mid-Level Leader">Mid-Level Leader (1-5 years)</option>
            <option value="Seasoned Leader">Seasoned Leader (5+ years)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">This determines your starting tier (QuickStart focuses on Tiers 1-3).</p>
        </div>

        {/* Goals */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-leader-accent">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Top 3 Leadership Goals ({goals.length}/3)</h3>
          <div className="space-y-2">
            {LEADERSHIP_TIERS.map(tier => (
              <div key={tier.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`goal-${tier.id}`}
                  checked={goals.includes(tier.id)}
                  onChange={() => toggleGoal(tier.id)}
                  disabled={!goals.includes(tier.id) && goals.length >= 3}
                  className="h-4 w-4 text-leader-accent border-gray-300 rounded focus:ring-leader-accent"
                />
                <label htmlFor={`goal-${tier.id}`} className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                  {tier.title}
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Your plan will heavily prioritize these areas.</p>
        </div>

        {/* Ratings */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-leader-blue">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Self-Rate Proficiency (1-10)</h3>
          {LEADERSHIP_TIERS.map(tier => (
            <div key={tier.id} className="mb-3">
              <label className="text-xs font-medium text-gray-600 flex justify-between">
                <span>{tier.title}</span>
                <span className="text-leader-accent font-bold">{ratings[tier.id]}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={ratings[tier.id] || 5}
                onChange={(e) => setRatings({ ...ratings, [tier.id]: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-leader-accent"
              />
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-2">Lower ratings will be prioritized in your early 'Reps'.</p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerateDisabled}
          className={`px-12 py-3 text-lg font-bold text-white rounded-lg shadow-xl transition transform hover:scale-[1.02] ${isGenerateDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-leader-blue hover:bg-blue-800 shadow-lg ring-1 ring-leader-blue/20'}`}
        >
          Generate 24-Month Plan
        </button>
        {message && <p className={`mt-4 font-semibold ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
      </div>
    </div>
  );
}

// Tracker Dashboard
function TrackerDashboard({ userId, userPlanData, setUserPlanData, db }) {
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [reflectionInput, setReflectionInput] = useState('');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [scenarioInput, setScenarioInput] = useState('');
  const [currentMonth, setCurrentMonth] = useState(userPlanData.currentMonth || 1);
  const [message, setMessage] = useState('');

  const plan = userPlanData.plan || [];
  const currentMonthPlan = useMemo(() => plan.find(p => p.month === currentMonth), [plan, currentMonth]);
  const progress = useMemo(() => Math.floor(((currentMonth - 1) / 24) * 100), [currentMonth]);
  const nextMonthPlan = useMemo(() => plan.find(p => p.month === currentMonth + 1), [plan, currentMonth]);

  useEffect(() => {
    setCurrentMonth(userPlanData.currentMonth ?? 1);
  }, [userPlanData.currentMonth]);

  const updatePlanReflectionLocal = useCallback(async (month, reflectionText) => {
    const planRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'leadership_plan', 'roadmap');
    const updatedPlan = (userPlanData.plan ?? []).map(p =>
      p.month === month ? { ...p, reflectionText } : p
    );

    await updateDoc(planRef, {
      plan: updatedPlan,
      lastUpdate: new Date().toISOString()
    });

    setUserPlanData(prev => ({
      ...prev,
      plan: updatedPlan
    }));
  }, [db, userId, userPlanData.plan, setUserPlanData]);

  const markComplete = useCallback(async (month, { skipReflectionCheck = false } = {}) => {
    if (!db) { setMessage("Firestore not initialized."); return; }

    const monthData = plan.find(p => p.month === month);

    if (!skipReflectionCheck && monthData && monthData.reflectionText === null) {
      setMessage("Please submit your Monthly Reflection before marking this month complete.");
      setIsReflectionModalOpen(true);
      return;
    }

    const planRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'leadership_plan', 'roadmap');
    const batch = writeBatch(db);

    const updatedPlan = plan.map(p =>
      p.month === month ? { ...p, status: 'Completed', dateCompleted: new Date().toISOString() } : p
    );

    batch.update(planRef, {
      plan: updatedPlan,
      currentMonth: Math.min(month + 1, 24),
      lastUpdate: new Date().toISOString()
    });

    try {
      await batch.commit();
      setMessage(`Month ${month} completed! Advancing to Month ${Math.min(month + 1, 24)} reps.`);
      setCurrentMonth(Math.min(month + 1, 24));
    } catch (e) {
      console.error("Error marking month complete:", e);
      setMessage(`Error: Could not update plan: ${e.message}`);
    }
  }, [db, userId, plan]);

  const handleSubmitReflection = useCallback(async () => {
    if (reflectionInput.length < 50 || !currentMonthPlan) return;

    setIsReflectionModalOpen(false);
    setMessage("Saving reflection...");
    try {
      await updatePlanReflectionLocal(currentMonthPlan.month, reflectionInput);
      await markComplete(currentMonthPlan.month, { skipReflectionCheck: true });
      setReflectionInput('');
    } catch (error) {
      console.error("Error submitting reflection:", error);
      setMessage(`Error: Failed to save reflection and complete month: ${error.message}`);
    }
  }, [reflectionInput, currentMonthPlan, updatePlanReflectionLocal, markComplete]);

  const handleScenarioSubmit = useCallback(async () => {
    if (scenarioInput.length < 50) return;

    setIsScenarioModalOpen(false);
    setMessage("Submitting scenario to your trainer...");

    try {
      const planRef = doc(db, 'artifacts', APP_ID, 'users', userId, 'leadership_plan', 'roadmap');

      await updateDoc(planRef, {
        latestScenario: {
          text: scenarioInput,
          date: new Date().toISOString(),
          month: currentMonthPlan.month
        },
        lastUpdate: new Date().toISOString()
      });

      setMessage("Scenario submitted! Be ready to discuss it in your Leaders Circle.");
      setScenarioInput(''); // fixed typo here
    } catch (e) {
      console.error("Error submitting scenario:", e);
      setMessage(`Error submitting scenario: ${e.message}`);
    }
  }, [scenarioInput, userId, currentMonthPlan, db]);

  const handleFeedbackLink = () => {
    const uniqueId = userId;
    const feedbackUrl = `https://leaderrepspd.netlify.app/feedback_form.html?user=${uniqueId}&tier=${currentMonthPlan.tier}`;
    // eslint-disable-next-line no-alert
    prompt("Feedback Link (Copy and Share)", feedbackUrl);
  };

  if (!currentMonthPlan) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-gray-800">Plan Loading...</h2>
        <p className="text-gray-600 mt-2">Checking the database for your 24-month roadmap.</p>
      </div>
    );
  }

  const { tier, theme, requiredContentIds } = currentMonthPlan;
  const tierDetails = LEADERSHIP_TIERS.find(t => t.id === tier);
  const nextTierDetails = nextMonthPlan ? LEADERSHIP_TIERS.find(t => t.id === nextMonthPlan.tier) : null;

  const completedItems = plan.filter(p => p.status === 'Completed').length;

  const contentList = useMemo(
    () => requiredContentIds.map(id => SAMPLE_CONTENT_LIBRARY.find(c => c.id === id)).filter(Boolean),
    [requiredContentIds]
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <TitleCard
        title="Your LeaderReps Tracker Dashboard"
        description={`Welcome, ${userId}. Track your progress through the 24-Month Playground Roadmap.`}
        icon={Home}
        color="leader-blue"
      />

      {/* Overall Progress & Quick Actions */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Roadmap Progress: Month {currentMonth} of 24</h3>
          <span className="text-xl font-bold text-leader-accent">{progress}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div className="h-3 rounded-full bg-leader-accent transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setIsScenarioModalOpen(true)}
            className="flex items-center justify-center p-3 text-sm font-semibold text-white bg-leader-blue rounded-lg hover:bg-blue-800 transition shadow-md"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Draft Leaders Circle Scenario
          </button>
          <button
            onClick={handleFeedbackLink}
            className="flex items-center justify-center p-3 text-sm font-semibold text-white bg-leader-accent rounded-lg hover:bg-orange-700 transition shadow-md"
          >
            <Send className="w-4 h-4 mr-2" />
            Request Multi-Source Feedback
          </button>
          <div className="text-sm p-3 bg-leader-light rounded-lg flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 text-leader-blue" />
            <span className='font-medium text-gray-700'>Completed Reps: {completedItems}</span>
          </div>
        </div>
        {message && <p className={`mt-4 text-center font-semibold ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
      </div>

      {/* Current Monthly Workout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-leader-accent">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{theme}</h3>
            <p className="text-sm text-gray-500 mb-4">Tier {tier}: {tierDetails.title}</p>

            <div className="space-y-4">
              {contentList.map((content) => (
                <a
                  key={content.id}
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-leader-light transition transform hover:scale-[1.01] shadow-sm cursor-pointer border border-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-leader-accent" />
                    <span className="font-semibold text-gray-700">{content.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full">{content.type}</span>
                    <span className="px-2 py-0.5 bg-gray-200 rounded-full">{content.duration} min</span>
                  </div>
                </a>
              ))}
            </div>

            {currentMonth < 25 && (
              <button
                onClick={() => setIsReflectionModalOpen(true)}
                className="w-full mt-6 py-3 text-lg font-bold text-white bg-leader-accent rounded-lg hover:bg-orange-700 transition shadow-md flex items-center justify-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Monthly Workout & Reflect
              </button>
            )}
            {currentMonthPlan.reflectionText && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-700">Reflection Saved: </p>
                <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">{currentMonthPlan.reflectionText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Month Preview */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-leader-blue">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-leader-blue" />
            Next Month's Focus (M{currentMonth + 1})
          </h3>
          {nextMonthPlan ? (
            <>
              <p className="text-md font-semibold text-gray-700">{nextMonthPlan.theme}</p>
              <p className="text-sm text-gray-500 mt-1">Tier {nextMonthPlan.tier}: {nextTierDetails?.title}</p>
              <p className="mt-3 text-sm text-gray-600">Get ready for these core Reps:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600">
                {nextMonthPlan.requiredContentIds.slice(0, 3).map((id, index) => (
                  <li key={`next-${id}-${index}`}>{SAMPLE_CONTENT_LIBRARY.find(c => c.id === id)?.title || `Resource ${index + 1}`}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-500">You have completed the 24-month roadmap! Well done, Exceptional Leader!</p>
          )}
          <p className="mt-4 text-xs text-gray-500">Your plan adapts based on your self-assessment and goals.</p>
        </div>
      </div>

      <ReflectionModal
        isOpen={isReflectionModalOpen}
        monthData={currentMonthPlan}
        reflectionInput={reflectionInput}
        setReflectionInput={setReflectionInput}
        onSubmit={handleSubmitReflection}
        onClose={() => setIsReflectionModalOpen(false)}
      />

      <ScenarioModal
        isOpen={isScenarioModalOpen}
        scenarioInput={scenarioInput}
        setScenarioInput={setScenarioInput}
        onSubmit={handleScenarioSubmit}
        onClose={() => setIsScenarioModalOpen(false)}
      />
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
function App({ firebaseConfig, initialAuthToken }) {
  const [dbService, setDbService] = useState(null);
  const [authService, setAuthService] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userPlanData, setUserPlanData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Initialization
  useEffect(() => {
    if (isInitialized) return;

    if (!firebaseConfig || !firebaseConfig.projectId) {
      setError("Firebase is not configured. Ensure credentials are passed correctly.");
      setIsLoading(false);
      return;
    }

    try {
      const appInstance = initializeApp(firebaseConfig);
      const dbInstance = getFirestore(appInstance);
      const authInstance = getAuth(appInstance);

      setDbService(dbInstance);
      setAuthService(authInstance);
      setIsInitialized(true);

      const initializeAuth = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(authInstance, initialAuthToken);
          } else {
            await signInAnonymously(authInstance);
          }
        } catch (e) {
          console.error("Auth Error:", e);
          setError(`Authentication Failed: ${e.message}`);
        }
      };

      const hangTimeout = setTimeout(() => {
        if (isLoading) {
          setError("Authentication hang detected. Check Firestore rules or network.");
          setIsLoading(false);
        }
      }, 7000);

      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        clearTimeout(hangTimeout);
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null);
        }
        // Plan snapshot will toggle isLoading to false when it runs
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
  }, [firebaseConfig, initialAuthToken, isInitialized, isLoading]);

  // 2. Data Listener (Plan Retrieval)
  useEffect(() => {
    if (!userId || !dbService || !isInitialized) return;

    const planRef = doc(dbService, 'artifacts', APP_ID, 'users', userId, 'leadership_plan', 'roadmap');

    const unsubscribe = onSnapshot(planRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserPlanData(data);
      } else {
        setUserPlanData(null);
      }
      setIsLoading(false);
    }, (e) => {
      if (e.code === 'permission-denied') {
        setError("Application Error: Failed to load plan: Missing or insufficient permissions. Ensure your Firestore Security Rules are correct.");
      } else {
        console.error("Firestore Snapshot Error:", e);
        setError(`Failed to load plan: ${e.message}`);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, isInitialized, dbService]);

  if (error) {
    return (
      <div className="p-8 text-center text-red-700 bg-red-100 rounded-lg max-w-lg mx-auto mt-12">
        <h1 className="text-xl font-bold">Application Error</h1>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  // Loading / Debug Override gate
  if (isLoading || !userId) {
    const handleManualLoad = () => {
      // 1) Immediately bypass to render the app
      setUserId(prev => prev ?? 'DEBUG_USER_ID_OVERRIDE');
      setIsLoading(false);

      // 2) Try real anon sign-in in background
      if (authService) {
        signInAnonymously(authService)
          .then(cred => {
            console.log('Anon user ready:', cred.user?.uid);
            // onAuthStateChanged will update userId if it succeeds
          })
          .catch(e => {
            console.error('Anon sign-in failed (debug mode will stay local):', e);
            setError(`Auth failed: ${e.message}`);
          });
      } else {
        console.warn('Auth not initialized yet; staying in local debug mode.');
      }
    };

    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="p-6 text-center text-gray-700">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leader-accent mx-auto"></div>
          <p className="mt-4 font-semibold">Authenticating and loading LeaderReps data...</p>
          <button
            onClick={handleManualLoad}
            className="mt-6 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition"
          >
            Load App Anyway (Debug Override)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {!userPlanData ? (
        <PlanGenerator
          userId={userId}
          setPlanData={setUserPlanData}
          setIsLoading={setIsLoading}
          db={dbService}
        />
      ) : (
        <TrackerDashboard
          userId={userId}
          userPlanData={userPlanData}
          setUserPlanData={setUserPlanData}
          db={dbService}
        />
      )}
      <p className="fixed bottom-2 left-2 text-xs text-gray-400">User ID: {userId}</p>
    </div>
  );
}

export default App;
