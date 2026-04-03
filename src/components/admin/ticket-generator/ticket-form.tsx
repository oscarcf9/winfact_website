"use client";

import { useCallback, useState } from "react";
import type { BetFormData, ParlayLeg, TeamData } from "./ticket-types";
import { DEFAULT_TEAM } from "./ticket-types";
import type { SportId } from "./sport-config";
import {
  SPORTS,
  PARLAY_OPTIONS,
  shouldShowScoreBar,
  hasTeamPrefix,
  getSubTypesForSport,
} from "./sport-config";
import { searchTeams, urlToDataUrl, getLeaguesForSport, type TeamLogo } from "./team-logos";

interface TicketFormProps {
  data: BetFormData;
  onChange: (data: BetFormData) => void;
}

export default function TicketForm({ data, onChange }: TicketFormProps) {
  const isSingle = data.betType === "Single";
  const showScore = isSingle && shouldShowScoreBar(data.subBetType);
  const needsTeamName = isSingle && hasTeamPrefix(data.subBetType);
  const availableSubTypes = getSubTypesForSport(data.sport);

  const update = useCallback(
    (partial: Partial<BetFormData>) => onChange({ ...data, ...partial }),
    [data, onChange]
  );

  const updateTeam = useCallback(
    (which: "team1" | "team2", partial: Partial<TeamData>) =>
      update({ [which]: { ...data[which], ...partial } }),
    [data, update]
  );

  const updateParlayLeg = useCallback(
    (index: number, partial: Partial<ParlayLeg>) => {
      const legs = [...data.parlayLegs];
      legs[index] = { ...legs[index], ...partial };
      update({ parlayLegs: legs });
    },
    [data, update]
  );

  const updateParlayLegTeam = useCallback(
    (legIndex: number, which: "team1" | "team2", partial: Partial<TeamData>) => {
      const legs = [...data.parlayLegs];
      legs[legIndex] = { ...legs[legIndex], [which]: { ...legs[legIndex][which], ...partial } };
      update({ parlayLegs: legs });
    },
    [data, update]
  );

  const handleBetTypeChange = useCallback(
    (betType: "Single" | "Parlay") => {
      if (betType === "Parlay") {
        update({
          betType, subBetType: "2-bet", parlayLegCount: 2,
          parlayLegs: [
            { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" },
            { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" },
          ],
        });
      } else {
        const firstSub = getSubTypesForSport(data.sport)[0];
        update({ betType, subBetType: firstSub?.id ?? "moneyline" });
      }
    },
    [data.sport, update]
  );

  const handleSportChange = useCallback(
    (sportId: SportId) => {
      const subs = getSubTypesForSport(sportId);
      update({ sport: sportId, subBetType: subs[0]?.id ?? "moneyline" });
    },
    [update]
  );

  const handleParlaySubTypeChange = useCallback(
    (subBetType: string) => {
      const option = PARLAY_OPTIONS.find((p) => p.id === subBetType);
      if (!option) return;
      const legCount = option.legs === "custom" ? data.parlayLegCount : option.legs;
      const legs = Array.from({ length: legCount }, (_, i) =>
        data.parlayLegs[i] || { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" }
      );
      update({ subBetType, parlayLegCount: legCount, parlayLegs: legs });
    },
    [data, update]
  );

  const handleCustomLegCount = useCallback(
    (count: number) => {
      if (count < 2 || count > 10) return;
      const legs = Array.from({ length: count }, (_, i) =>
        data.parlayLegs[i] || { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" }
      );
      update({ parlayLegCount: count, parlayLegs: legs });
    },
    [data, update]
  );

  return (
    <div className="space-y-4">
      {/* ── Bet Type + Sport + Sub-Type ── */}
      <Section title="Bet Configuration">
        {/* Bet Type Toggle */}
        <div className="grid grid-cols-2 gap-3">
          {(["Single", "Parlay"] as const).map((type) => (
            <button
              key={type} type="button"
              onClick={() => handleBetTypeChange(type)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                data.betType === type ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
              }`}
            >
              {type} Bet
            </button>
          ))}
        </div>

        {/* Sport Selector — always visible for single bets */}
        {isSingle && (
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-900 mb-2 block">Sport</label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((sport) => (
                <button
                  key={sport.id} type="button"
                  onClick={() => handleSportChange(sport.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-sm ${
                    data.sport === sport.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-base">{sport.emoji}</span>
                  <span>{sport.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sub-Type Dropdown */}
        <div className="mt-4">
          <label className="text-sm font-semibold text-gray-900 mb-2 block">Bet Sub-Type</label>
          <select
            value={data.subBetType}
            onChange={(e) => isSingle ? update({ subBetType: e.target.value }) : handleParlaySubTypeChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          >
            {isSingle
              ? availableSubTypes.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)
              : PARLAY_OPTIONS.map((po) => <option key={po.id} value={po.id}>{po.label}</option>)}
          </select>
        </div>

        {!isSingle && data.subBetType === "custom" && (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm font-semibold text-gray-900">Legs:</span>
            <input type="number" min={2} max={10} value={data.parlayLegCount}
              onChange={(e) => handleCustomLegCount(parseInt(e.target.value) || 2)}
              className="w-20 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-center focus:border-blue-500 outline-none"
            />
          </div>
        )}
      </Section>

      {/* ── Pick Details (Description + Odds grouped together) ── */}
      <Section title="Pick Details">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Bet Description</label>
            <input type="text" value={data.betDescription}
              onChange={(e) => update({ betDescription: e.target.value })}
              placeholder="e.g., Over 3.5, Knicks -6.5"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Odds</label>
            <input type="text" value={isSingle ? data.odds : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || v === "-" || v === "+" || /^[+-]?\d*$/.test(v)) update({ odds: v });
              }}
              placeholder="-145"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-center font-mono focus:border-blue-500 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Team Name — for team-specific bet types */}
        {isSingle && needsTeamName && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-700">Team Name (for ticket label)</label>
            <input type="text" value={data.teamName}
              onChange={(e) => update({ teamName: e.target.value })}
              placeholder="e.g., Brewers, Benfica"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
            />
            {data.teamName && (
              <p className="text-xs text-blue-500 mt-1 font-medium">
                Ticket label: {data.teamName.toUpperCase()} {availableSubTypes.find(s => s.id === data.subBetType)?.display ?? ""}
              </p>
            )}
          </div>
        )}

        {/* Matchup — for prop bets without score bar */}
        {isSingle && !showScore && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-700">Matchup</label>
            <input type="text" value={data.matchup}
              onChange={(e) => update({ matchup: e.target.value })}
              placeholder="e.g., Magic @ Cavaliers"
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
            />
          </div>
        )}
      </Section>

      {/* ── Teams (side by side, prominent) — only for score bar bets ── */}
      {isSingle && showScore && (
        <Section title="Teams & Score">
          <div className="grid grid-cols-2 gap-4">
            <TeamCard
              label="Team 1"
              team={data.team1}
              sport={data.sport}
              onChange={(t) => updateTeam("team1", t)}
            />
            <TeamCard
              label="Team 2"
              team={data.team2}
              sport={data.sport}
              onChange={(t) => updateTeam("team2", t)}
            />
          </div>
        </Section>
      )}

      {/* ── Parlay Legs ── */}
      {!isSingle && (
        <Section title="Parlay Legs">
          <div className="space-y-3">
            {data.parlayLegs.map((leg, i) => (
              <div key={i} className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                <span className="text-xs font-bold text-gray-500">LEG {i + 1}</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="text" value={leg.team1.acronym} placeholder="Team 1"
                      onChange={(e) => updateParlayLegTeam(i, "team1", { acronym: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <input type="text" value={leg.team2.acronym} placeholder="Team 2"
                      onChange={(e) => updateParlayLegTeam(i, "team2", { acronym: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <input type="text" value={leg.odds} placeholder="Odds (e.g., -110)"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || v === "-" || v === "+" || /^[+-]?\d*$/.test(v)) updateParlayLeg(i, { odds: v });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-mono focus:border-blue-500 outline-none placeholder:text-gray-400"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Wager & Payout ── */}
      <Section title="Wager & Payout">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700">Wager</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input type="text" value={data.wager}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) update({ wager: v });
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-blue-500 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Paid</label>
              <span className="text-[9px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">AUTO</span>
            </div>
            <input type="text" value={data.paid} readOnly
              className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-900 cursor-not-allowed"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Section wrapper ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Team Card with logo library ──

function TeamCard({
  label,
  team,
  sport,
  onChange,
}: {
  label: string;
  team: TeamData;
  sport: string;
  onChange: (partial: Partial<TeamData>) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [logoSearch, setLogoSearch] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("");
  const [isLoadingLogo, setIsLoadingLogo] = useState(false);

  const leagues = getLeaguesForSport(sport);
  const results = searchTeams(logoSearch, sport, selectedLeague || undefined);

  const handlePickLogo = async (logo: TeamLogo) => {
    setIsLoadingLogo(true);
    try {
      const dataUrl = await urlToDataUrl(logo.url);
      onChange({ logoDataUrl: dataUrl, acronym: team.acronym || logo.abbr });
      setShowPicker(false);
      setLogoSearch("");
    } catch {
      // If ESPN fetch fails, use URL directly (will work in preview but may not export)
      onChange({ logoDataUrl: logo.url, acronym: team.acronym || logo.abbr });
      setShowPicker(false);
    } finally {
      setIsLoadingLogo(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
        {team.logoDataUrl && (
          <button type="button" onClick={() => onChange({ logoDataUrl: undefined })}
            className="text-[10px] text-red-400 hover:text-red-600">
            Remove logo
          </button>
        )}
      </div>

      {/* Logo preview + picker trigger */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowPicker(!showPicker)}
          className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-white hover:border-blue-400 transition-colors overflow-hidden flex-shrink-0"
        >
          {team.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoDataUrl} alt="" className="w-10 h-10 object-contain" />
          ) : (
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          )}
        </button>
        <div className="flex-1 space-y-1.5">
          <input type="text" value={team.acronym}
            onChange={(e) => onChange({ acronym: e.target.value })}
            placeholder="Acronym (STL)"
            className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-semibold focus:border-blue-500 outline-none placeholder:text-gray-400 placeholder:font-normal"
          />
          <input type="text" value={team.score}
            onChange={(e) => { if (/^\d*$/.test(e.target.value)) onChange({ score: e.target.value }); }}
            placeholder="Score"
            className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Logo Picker Dropdown */}
      {showPicker && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-lg p-3 space-y-2">
          <input type="text" value={logoSearch}
            onChange={(e) => setLogoSearch(e.target.value)}
            placeholder="Search teams..."
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:border-blue-500 outline-none placeholder:text-gray-400"
          />

          {/* League tabs */}
          {leagues.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <button type="button"
                onClick={() => setSelectedLeague("")}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${!selectedLeague ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                All
              </button>
              {leagues.map((lg) => (
                <button key={lg} type="button"
                  onClick={() => setSelectedLeague(lg)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${selectedLeague === lg ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {lg}
                </button>
              ))}
            </div>
          )}

          {/* Team grid */}
          <div className="max-h-48 overflow-y-auto">
            {isLoadingLogo ? (
              <div className="text-center py-4 text-xs text-gray-400">Loading logo...</div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {results.map((t) => (
                  <button key={`${t.league}-${t.abbr}`} type="button"
                    onClick={() => handlePickLogo(t)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title={t.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.url} alt={t.name} className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="text-[9px] font-medium text-gray-600 leading-tight text-center truncate w-full">{t.abbr}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-gray-400">No teams found</div>
            )}
          </div>

          {/* Upload or URL */}
          <div className="flex gap-2 pt-1 border-t border-gray-100">
            <label className="flex-1 text-center py-1.5 rounded-md bg-gray-100 text-[10px] font-medium text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
              Upload file
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { handleFileUpload(file); setShowPicker(false); }
                }}
              />
            </label>
            <button type="button"
              onClick={() => {
                const url = prompt("Enter logo image URL:");
                if (url) {
                  urlToDataUrl(url).then((dataUrl) => {
                    onChange({ logoDataUrl: dataUrl });
                    setShowPicker(false);
                  }).catch(() => {
                    onChange({ logoDataUrl: url });
                    setShowPicker(false);
                  });
                }
              }}
              className="flex-1 text-center py-1.5 rounded-md bg-gray-100 text-[10px] font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Paste URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
