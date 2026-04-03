"use client";

import { useCallback } from "react";
import type { BetFormData, ParlayLeg, TeamData } from "./ticket-types";
import { DEFAULT_TEAM } from "./ticket-types";
import { SINGLE_BET_SUB_TYPES, PARLAY_OPTIONS, shouldShowScoreBar } from "./sport-config";

interface TicketFormProps {
  data: BetFormData;
  onChange: (data: BetFormData) => void;
}

export default function TicketForm({ data, onChange }: TicketFormProps) {
  const isSingle = data.betType === "Single";

  const update = useCallback(
    (partial: Partial<BetFormData>) => {
      onChange({ ...data, ...partial });
    },
    [data, onChange]
  );

  const updateTeam = useCallback(
    (which: "team1" | "team2", partial: Partial<TeamData>) => {
      update({ [which]: { ...data[which], ...partial } });
    },
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
      legs[legIndex] = {
        ...legs[legIndex],
        [which]: { ...legs[legIndex][which], ...partial },
      };
      update({ parlayLegs: legs });
    },
    [data, update]
  );

  const handleBetTypeChange = useCallback(
    (betType: "Single" | "Parlay") => {
      if (betType === "Parlay") {
        update({
          betType,
          subBetType: "2-bet",
          parlayLegCount: 2,
          parlayLegs: [
            { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" },
            { team1: { ...DEFAULT_TEAM }, team2: { ...DEFAULT_TEAM }, odds: "" },
          ],
        });
      } else {
        update({ betType, subBetType: "moneyline" });
      }
    },
    [update]
  );

  const handleParlaySubTypeChange = useCallback(
    (subBetType: string) => {
      const option = PARLAY_OPTIONS.find((p) => p.id === subBetType);
      if (!option) return;

      const legCount =
        option.legs === "custom" ? data.parlayLegCount : option.legs;
      const legs = Array.from({ length: legCount }, (_, i) =>
        data.parlayLegs[i] || {
          team1: { ...DEFAULT_TEAM },
          team2: { ...DEFAULT_TEAM },
          odds: "",
        }
      );
      update({ subBetType, parlayLegCount: legCount, parlayLegs: legs });
    },
    [data, update]
  );

  const handleCustomLegCount = useCallback(
    (count: number) => {
      if (count < 2 || count > 10) return;
      const legs = Array.from({ length: count }, (_, i) =>
        data.parlayLegs[i] || {
          team1: { ...DEFAULT_TEAM },
          team2: { ...DEFAULT_TEAM },
          odds: "",
        }
      );
      update({ parlayLegCount: count, parlayLegs: legs });
    },
    [data, update]
  );

  const handleLogoUpload = useCallback(
    async (
      file: File,
      target:
        | { type: "single"; which: "team1" | "team2" }
        | { type: "parlay"; legIndex: number; which: "team1" | "team2" }
    ) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (target.type === "single") {
          updateTeam(target.which, { logoDataUrl: dataUrl });
        } else {
          updateParlayLegTeam(target.legIndex, target.which, {
            logoDataUrl: dataUrl,
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [updateTeam, updateParlayLegTeam]
  );

  return (
    <div className="space-y-4">
      {/* Bet Type */}
      <Section title="Bet Configuration" icon="settings">
        <label className="text-sm font-semibold text-gray-900">Bet Type</label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(["Single", "Parlay"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleBetTypeChange(type)}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                data.betType === type
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  data.betType === type
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-400"
                }`}
              >
                {data.betType === type && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              <span className="text-sm font-medium">{type} Bet</span>
            </button>
          ))}
        </div>

        {/* Sub Type */}
        <label className="text-sm font-semibold text-gray-900 mt-4 block">
          Bet Sub-Type
        </label>
        <select
          value={data.subBetType}
          onChange={(e) =>
            isSingle
              ? update({ subBetType: e.target.value })
              : handleParlaySubTypeChange(e.target.value)
          }
          className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        >
          {isSingle
            ? SINGLE_BET_SUB_TYPES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))
            : PARLAY_OPTIONS.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.label}
                </option>
              ))}
        </select>

        {!isSingle && data.subBetType === "custom" && (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm font-semibold text-gray-900">
              Number of Legs:
            </span>
            <input
              type="number"
              min={2}
              max={10}
              value={data.parlayLegCount}
              onChange={(e) => handleCustomLegCount(parseInt(e.target.value) || 2)}
              className="w-20 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-center focus:border-blue-500 outline-none"
            />
          </div>
        )}
      </Section>

      {/* Game Details */}
      <Section title="Game Details" icon="info">
        <label className="text-sm font-semibold text-gray-900">
          Bet Description
        </label>
        <input
          type="text"
          value={data.betDescription}
          onChange={(e) => update({ betDescription: e.target.value })}
          placeholder="e.g., STL Cardinals -1.5, Over 52.5, Nuggets -1.5"
          className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-gray-400"
        />

        {isSingle ? (
          <>
            {/* Matchup — shown for prop bets that don't use the score bar */}
            {!shouldShowScoreBar(data.subBetType) && (
              <div className="mt-3">
                <label className="text-sm font-semibold text-gray-900">
                  Matchup
                </label>
                <input
                  type="text"
                  value={data.matchup}
                  onChange={(e) => update({ matchup: e.target.value })}
                  placeholder="e.g., Magic @ Cavaliers, Twins @ Orioles"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Team inputs — shown when score bar is visible */}
            {shouldShowScoreBar(data.subBetType) && (
              <div className="mt-4 space-y-3">
                <TeamInput
                  label="Team 1"
                  team={data.team1}
                  onChange={(t) => updateTeam("team1", t)}
                  onLogoUpload={(f) =>
                    handleLogoUpload(f, { type: "single", which: "team1" })
                  }
                />
                <TeamInput
                  label="Team 2"
                  team={data.team2}
                  onChange={(t) => updateTeam("team2", t)}
                  onLogoUpload={(f) =>
                    handleLogoUpload(f, { type: "single", which: "team2" })
                  }
                />
              </div>
            )}

            <label className="text-sm font-semibold text-gray-900 mt-4 block">
              Odds
            </label>
            <input
              type="text"
              value={data.odds}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || v === "-" || v === "+" || /^[+-]?\d*$/.test(v)) {
                  update({ odds: v });
                }
              }}
              placeholder="e.g., -145, +120"
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-gray-400"
            />
          </>
        ) : (
          <div className="mt-4 space-y-4">
            {data.parlayLegs.map((leg, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-gray-200 bg-white space-y-3"
              >
                <span className="text-sm font-semibold text-gray-900">
                  Leg {i + 1}
                </span>
                <TeamInput
                  label="Team 1"
                  team={leg.team1}
                  onChange={(t) => updateParlayLegTeam(i, "team1", t)}
                  onLogoUpload={(f) =>
                    handleLogoUpload(f, {
                      type: "parlay",
                      legIndex: i,
                      which: "team1",
                    })
                  }
                />
                <TeamInput
                  label="Team 2"
                  team={leg.team2}
                  onChange={(t) => updateParlayLegTeam(i, "team2", t)}
                  onLogoUpload={(f) =>
                    handleLogoUpload(f, {
                      type: "parlay",
                      legIndex: i,
                      which: "team2",
                    })
                  }
                />
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Odds
                  </label>
                  <input
                    type="text"
                    value={leg.odds}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (
                        v === "" ||
                        v === "-" ||
                        v === "+" ||
                        /^[+-]?\d*$/.test(v)
                      ) {
                        updateParlayLeg(i, { odds: v });
                      }
                    }}
                    placeholder="e.g., -110"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Monetary */}
      <Section title="Monetary Details" icon="dollar">
        <label className="text-sm font-semibold text-gray-900">
          Wager Amount
        </label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            type="text"
            value={data.wager}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) {
                update({ wager: v });
              }
            }}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-900">
              Paid Amount
            </label>
            <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-lg">
              Auto-calculated
            </span>
          </div>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </span>
            <input
              type="text"
              value={data.paid}
              readOnly
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-900 font-semibold cursor-not-allowed"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Sub-Components ──

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: "settings" | "info" | "dollar";
  children: React.ReactNode;
}) {
  const iconMap = {
    settings: (
      <svg
        className="w-4 h-4 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    info: (
      <svg
        className="w-4 h-4 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    dollar: (
      <svg
        className="w-4 h-4 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="p-1.5 bg-blue-50 rounded-lg">{iconMap[icon]}</div>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TeamInput({
  label,
  team,
  onChange,
  onLogoUpload,
}: {
  label: string;
  team: TeamData;
  onChange: (partial: Partial<TeamData>) => void;
  onLogoUpload: (file: File) => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
      <span className="text-xs font-semibold text-gray-900">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Acronym</label>
          <input
            type="text"
            value={team.acronym}
            onChange={(e) => onChange({ acronym: e.target.value })}
            placeholder="e.g., STL"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Score</label>
          <input
            type="text"
            value={team.score}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                onChange({ score: e.target.value });
              }
            }}
            placeholder="0"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-blue-500 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500">
          Logo (Optional)
        </label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            readOnly
            value={team.logoDataUrl ? "Logo selected" : ""}
            placeholder="No logo selected"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-xs text-gray-500 cursor-not-allowed"
          />
          <label className="px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium cursor-pointer hover:bg-blue-600 transition-colors">
            Browse
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLogoUpload(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
