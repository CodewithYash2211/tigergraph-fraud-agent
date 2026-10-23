"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, CircleDot, Clock3, Network, ScanSearch, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/nav/Navbar";
import { BRAND } from "@/lib/brand";

function Story({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`story-reveal ${className}`}>{children}</section>;
}

function InvestigationDiagram() {
  const nodes = [
    { x: 18, y: 29, title: "Customer", type: "Identity" },
    { x: 80, y: 18, title: "Card", type: "Payment" },
    { x: 83, y: 78, title: "Device", type: "Relationship" },
    { x: 22, y: 79, title: "Prior case", type: "History" },
    { x: 51, y: 49, title: "Transaction", type: "Illustrative event" },
  ];
  return (
    <div className="landing-diagram" aria-label="Illustrative transaction relationship diagram">
      <div className="diagram-topline"><span><span className="live-dot" /> INVESTIGATION CONTEXT</span><span>ILLUSTRATIVE</span></div>
      <svg viewBox="0 0 100 100" className="diagram-links" aria-hidden="true">
        {[[18,29,51,49],[80,18,51,49],[83,78,51,49],[22,79,51,49],[18,29,22,79],[80,18,83,78]].map(([x1,y1,x2,y2],i) =>
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={i < 4 ? "diagram-link active" : "diagram-link"} />)}
      </svg>
      {nodes.map((node, index) => <div key={node.title} className={`diagram-node cinematic-node ${node.title === "Transaction" ? "central" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${.75 + index * .24}s` }}>
        <span className="diagram-node-icon">{node.title === "Transaction" ? <ScanSearch size={17} /> : <CircleDot size={14} />}</span>
        <span className="diagram-node-label">{node.title}</span><span className="diagram-node-type">{node.type}</span>
      </div>)}
      <div className="diagram-foot"><span>Relationships organize evidence for review</span><span className="diagram-foot-mark">TG / GRAPH</span></div>
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    const targets = document.querySelectorAll(".story-reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return <div className="landing-page">
    <Navbar variant="landing" />
    <main>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-kicker"><span className="live-dot" /> GRAPH-BASED FRAUD INVESTIGATION</div>
          <h1>Fraud doesn&rsquo;t happen in <span>isolation.</span></h1>
          <p>Connect machine learning, transaction relationships, and historical context to support fraud investigations.</p>
          <div className="landing-actions">
            <a href="#approach" className="landing-primary">Explore the platform <ArrowDown size={16} /></a>
            <Link href="/role" className="landing-secondary">Enter workspace <ArrowRight size={15} /></Link>
          </div>
          <div className="landing-proofline"><span><Network size={15} /> Relationship evidence</span><span><ScanSearch size={15} /> Explainable review</span><span><ShieldCheck size={15} /> Policy-led action</span></div>
        </div>
        <div className="landing-hero-visual">
          <div className="context-panel context-panel-activity"><span className="context-icon blue"><Clock3 size={15} /></span><span><b>Transaction activity</b><small>Selected case record</small></span></div>
          <div className="context-panel context-panel-top"><span className="context-icon violet"><Network size={15} /></span><span><b>Graph intelligence</b><small>Connected entities and transactions</small></span><span className="context-arrow">↗</span></div>
          <InvestigationDiagram />
          <div className="context-panel context-panel-bottom"><span className="context-icon blue"><ScanSearch size={15} /></span><span><b>Evidence context</b><small>Signals, history and uncertainty</small></span><span className="context-status">REVIEW</span></div>
          <div className="context-panel context-panel-ml"><span className="context-icon violet"><ShieldCheck size={15} /></span><span><b>ML assessment</b><small>Shadow signal · separate from policy</small></span></div>
          <div className="context-panel context-panel-history"><span className="context-icon blue"><CircleDot size={15} /></span><span><b>Historical context</b><small>Prior findings when available</small></span></div>
        </div>
        <div className="hero-index"><span>01 / INVESTIGATION SYSTEM</span><span>Evidence before action</span></div>
      </section>

      <div id="approach" className="story-sequence">
        <Story className="story-section story-intro">
          <div className="story-number">01 <span>THE PROBLEM</span></div>
          <div><h2>One transaction is only one piece of the story.</h2><p>Repeated cards, devices and transaction patterns can connect activity that looks unrelated in a flat list. Investigation starts by assembling the available signals and their relationships.</p></div>
          <div className="story-aside"><Network size={21} /><span>Entity relationships<br />provide investigation context.</span></div>
        </Story>

        <Story className="story-section story-split">
          <div className="story-visual signal-visual"><div className="visual-label">SIGNAL REVIEW <span>01—02</span></div><div className="signal-row"><span className="signal-dot amber" /> Transaction attributes <span>Observed</span></div><div className="signal-row"><span className="signal-dot violet-dot" /> XGBoost shadow score <span>Additional signal</span></div><div className="signal-row"><span className="signal-dot green" /> Existing policy rules <span>Decision input</span></div><div className="visual-note">Model output is displayed separately from the dataset risk score and does not control policy.</div></div>
          <div className="story-copy"><div className="story-number">02 <span>TRANSACTION SIGNALS</span></div><h2>Identify suspicious signals.</h2><p>The trained XGBoost model scores a transaction in shadow mode. Analysts can compare that output with the existing risk score while the established assessment and policy flow remains in control.</p></div>
        </Story>

        <Story className="story-section story-split reverse">
          <div className="story-copy"><div className="story-number">03 <span>GRAPH INTELLIGENCE</span></div><h2>Follow the connections.</h2><p>Installed TigerGraph queries return relationship, pattern and velocity evidence for the investigated transaction. The interface presents available graph evidence with its status and provenance.</p></div>
          <div className="story-visual graph-visual"><div className="visual-label">RELATIONSHIP CONTEXT <span>CONCEPTUAL VIEW</span></div><div className="mini-network"><i /><i /><i /><i /><i /><b>TXN</b><span className="edge e1" /><span className="edge e2" /><span className="edge e3" /><span className="edge e4" /></div><div className="visual-note">Illustrative structure only. Investigation views use the graph response returned for the selected case.</div></div>
        </Story>

        <Story className="story-section story-split">
          <div className="story-visual evidence-visual"><div className="visual-label">GROUNDED INVESTIGATION CONTEXT</div><div className="evidence-line"><span>01</span><b>Graph evidence</b><small>Relationships · patterns · velocity</small><CheckCircle2 size={15} /></div><div className="evidence-line"><span>02</span><b>Historical cases</b><small>Relevant prior findings when available</small><CheckCircle2 size={15} /></div><div className="evidence-line"><span>03</span><b>Uncertainty</b><small>Missing or conflicting evidence stays visible</small><CircleDot size={15} /></div><div className="visual-note">Evidence is retrieved deterministically and kept distinct by source.</div></div>
          <div className="story-copy"><div className="story-number">04 <span>HISTORY & EVIDENCE</span></div><h2>Connect signals, relationships, and evidence.</h2><p>Relevant closed-case findings and policy guidance join graph and transaction evidence in a structured context. The assessment records what supports a conclusion and what is still missing.</p></div>
        </Story>

        <Story className="story-section story-decision">
          <div className="story-number">05 <span>DECISION & REVIEW</span></div>
          <div className="decision-copy"><h2>AI assists. Analysts decide.<br /><span>Existing policy guides the action.</span></h2><p>The deterministic workflow evaluates the investigation under the existing policy rules, records its recommended action and approval route, and persists the case. The ML shadow score does not feed policy.</p></div>
          <div className="decision-flow"><div><small>INVESTIGATION</small><b>Evidence + assessment</b></div><i /><div><small>EXISTING RULES</small><b>Policy evaluation</b></div><i /><div className="decision-final"><small>RECORDED OUTCOME</small><b>Action + case record</b></div></div>
          <Link href="/role" className="landing-primary">Enter the workspace <ArrowRight size={16} /></Link>
        </Story>
      </div>
    </main>
    <footer className="landing-footer"><span>{BRAND.name} · {BRAND.product}</span><span>Investigation context is shown with its source and availability.</span></footer>
  </div>;
}
