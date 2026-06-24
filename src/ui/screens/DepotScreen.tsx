import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { audio } from "@/audio/engine";
import { config } from "@/config";
import { allCoDrivers, getCoDriver } from "@/content/coDrivers";
import { getEncounterBank, getNpc } from "@/content/encounters";
import { getSponsor } from "@/content/sponsors";
import { tapLight } from "@/platform/haptics";
import type { EncounterChoice } from "@/schemas/encounter";
import { resolveDepotEncounter } from "@/sim/depotSocial";
import { gotoNode, type ResolvedEncounter } from "@/sim/encounters";
import {
  adjust,
  buildLoadout,
  canBuy,
  canBuyUpgrade,
  canSell,
  cartCost,
  cartPayload,
  type DepotState,
  initialDepot,
  missingVitals,
  upgradesCreditCost,
} from "@/sim/loadout";
import { run } from "@/sim/run";
import { useGameStore } from "@/state/store";
import { GlassPanel } from "@/ui/components/GlassPanel";
import { NpcPortrait } from "@/ui/components/NpcPortrait";
import { useDeviceProfile } from "@/ui/useDeviceProfile";

type DepotStation = "codriver" | "manifest" | "okonkwo" | "reyes" | null;
type NpcDepotStation = "okonkwo" | "reyes";
type ManifestTab = "supplies" | "upgrades";

/** Approx Sols a vital pool lasts the crew at filling rations (forecast hint). */
function lastsForSols(itemId: string, qty: number): number | null {
  const crew = config.crew.roster.length;
  const drain = config.resources.drainPerCrew;
  const perSol: Record<string, number> = {
    oxygen: drain.oxygen * crew,
    water: drain.water * crew,
    rations: drain.rations * crew,
  };
  const rate = perSol[itemId];
  if (!rate) return null;
  return Math.floor(qty / rate);
}

function StoreRow({
  itemId,
  cart,
  budget,
  onAdjust,
}: {
  itemId: string;
  cart: DepotState;
  budget: number;
  onAdjust: (dir: 1 | -1) => void;
}) {
  const item = config.store.items.find((i) => i.id === itemId);
  if (!item) return null;
  const qty = cart[item.id] ?? 0;
  const sols = lastsForSols(item.id, qty);

  return (
    <div className="grid min-h-[56px] grid-cols-[minmax(8rem,1fr)_44px_2.5rem_44px] items-center gap-2 border-b border-[var(--color-ui-border)]/35 py-1">
      <div className="min-w-0">
        <p className="text-wrap font-display text-[0.82rem] leading-tight tracking-wide text-mars-sand">
          {item.name}
        </p>
        <p className="font-mono text-[0.58rem] leading-tight text-mars-sand/55">
          {item.price} CR{item.isBulk ? "/unit" : " ea"}
          {sols != null && qty > 0 ? ` · ~${sols} Sols` : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Sell ${item.name}`}
        disabled={!canSell(cart, item.id)}
        onClick={() => onAdjust(-1)}
        className="grid h-11 w-11 place-items-center rounded border border-[var(--color-ui-border)] font-display text-lg text-mars-sand transition-colors enabled:hover:text-mars-dust disabled:opacity-30"
      >
        -
      </button>
      <span className="text-center font-mono text-sm tabular-nums text-mars-sand">{qty}</span>
      <button
        type="button"
        aria-label={`Buy ${item.name}`}
        disabled={!canBuy(cart, item.id, budget)}
        onClick={() => onAdjust(1)}
        className="grid h-11 w-11 place-items-center rounded border border-[var(--color-ui-border)] font-display text-lg text-mars-sand transition-colors enabled:hover:text-mars-dust disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function UpgradeRow({
  upgradeId,
  cart,
  selected,
  budget,
  onToggle,
}: {
  upgradeId: string;
  cart: DepotState;
  selected: string[];
  budget: number;
  onToggle: () => void;
}) {
  const upg = config.upgrades.catalog.find((u) => u.id === upgradeId);
  if (!upg) return null;
  const installed = selected.includes(upg.id);
  const affordable = installed || canBuyUpgrade(cart, selected, upg.id, budget);

  return (
    <div className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_5.4rem] items-center gap-2 border-b border-[var(--color-ui-border)]/35 py-1.5">
      <div className="min-w-0">
        <p className="truncate font-display text-[0.82rem] tracking-wide text-mars-sand">
          {upg.name}
        </p>
        <p className="line-clamp-1 font-mono text-[0.58rem] text-mars-sand/55">{upg.desc}</p>
        <p className="font-mono text-[0.56rem] text-mars-sand/45">
          {upg.creditCost.toLocaleString()} CR
        </p>
      </div>
      <button
        type="button"
        aria-label={`${installed ? "Remove" : "Install"} ${upg.name}`}
        disabled={!affordable}
        onClick={onToggle}
        className="min-h-[44px] rounded border px-2 font-display text-[0.68rem] uppercase tracking-[0.1em] transition-colors disabled:opacity-30"
        style={{
          borderColor: installed ? "var(--color-ok)" : "var(--color-ui-border)",
          color: installed ? "var(--color-ok)" : "var(--color-mars-sand)",
          background: installed ? "rgba(68,255,170,0.1)" : "transparent",
        }}
      >
        {installed ? "Installed" : "Install"}
      </button>
    </div>
  );
}

function StationButton({
  label,
  detail,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  detail: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="min-h-[56px] min-w-0 overflow-hidden rounded border bg-black/35 px-3 py-2 text-left transition-colors enabled:hover:border-[var(--color-mars-dust)] disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        borderColor: disabled
          ? "var(--color-alert)"
          : active
            ? "var(--color-mars-dust)"
            : "var(--color-ui-border)",
        boxShadow: active ? "inset 0 0 16px rgba(204,112,82,0.18)" : "none",
        minHeight: 56,
      }}
    >
      <span className="block truncate font-display text-[0.78rem] uppercase tracking-[0.13em] text-mars-sand">
        {label}
      </span>
      <span className="block truncate font-mono text-[0.56rem] uppercase tracking-[0.12em] text-mars-sand/55">
        {detail}
      </span>
    </button>
  );
}

function MissionStrip({
  sponsorLine,
  credits,
  budget,
  payload,
  cap,
  missing,
}: {
  sponsorLine: string;
  credits: number;
  budget: number;
  payload: number;
  cap: number;
  missing: string[];
}) {
  return (
    <GlassPanel
      className="pointer-events-auto absolute top-3 left-3 w-[min(26rem,calc(100vw-1.5rem))] p-4 pt-[max(0.9rem,env(safe-area-inset-top))]"
      motionProps={{
        initial: { y: -14, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.25 },
      }}
    >
      <p className="font-display text-[0.62rem] uppercase tracking-[0.32em] text-mars-dust">
        Martian Trail
      </p>
      <h2 className="font-display text-2xl font-bold leading-none tracking-wide text-mars-sand">
        UNDERHILL DEPOT
      </h2>
      <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-mars-sand/60">
        {sponsorLine}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded border border-[var(--color-ui-border)]/70 bg-black/25 p-2">
          <p className="font-display text-[0.56rem] uppercase tracking-[0.18em] text-mars-sand/55">
            Credits
          </p>
          <p
            className="font-mono text-base tabular-nums"
            style={{ color: credits < 0 ? "var(--color-alert)" : "var(--color-ok)" }}
          >
            {credits.toLocaleString()}
          </p>
          <p className="font-mono text-[0.54rem] text-mars-sand/40">
            of {budget.toLocaleString()} CR
          </p>
        </div>
        <div className="rounded border border-[var(--color-ui-border)]/70 bg-black/25 p-2">
          <p className="font-display text-[0.56rem] uppercase tracking-[0.18em] text-mars-sand/55">
            Payload
          </p>
          <p className="font-mono text-base tabular-nums text-mars-sand">{payload}</p>
          <p className="font-mono text-[0.54rem] text-mars-sand/40">of {cap} cap</p>
        </div>
      </div>
      {missing.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 font-display text-[0.68rem] uppercase tracking-[0.12em]"
          style={{ color: "var(--color-alert)" }}
        >
          No {missing.join(", ")} loaded - crew will not survive the trail.
        </motion.p>
      )}
    </GlassPanel>
  );
}

function ManifestTerminal({
  cart,
  upgrades,
  budget,
  activeTab,
  onTab,
  onAdjust,
  onToggleUpgrade,
  onClose,
}: {
  cart: DepotState;
  upgrades: string[];
  budget: number;
  activeTab: ManifestTab;
  onTab: (tab: ManifestTab) => void;
  onAdjust: (itemId: string, dir: 1 | -1) => void;
  onToggleUpgrade: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <StationPanel title="Manifest Terminal" eyebrow="Cargo gantry">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onTab("supplies")}
          className="min-h-[40px] flex-1 rounded border px-3 font-display text-[0.72rem] uppercase tracking-[0.14em]"
          style={{
            borderColor:
              activeTab === "supplies" ? "var(--color-mars-dust)" : "var(--color-ui-border)",
            color: activeTab === "supplies" ? "var(--color-mars-dust)" : "var(--color-mars-sand)",
          }}
        >
          Supplies
        </button>
        <button
          type="button"
          onClick={() => onTab("upgrades")}
          className="min-h-[40px] flex-1 rounded border px-3 font-display text-[0.72rem] uppercase tracking-[0.14em]"
          style={{
            borderColor:
              activeTab === "upgrades" ? "var(--color-mars-dust)" : "var(--color-ui-border)",
            color: activeTab === "upgrades" ? "var(--color-mars-dust)" : "var(--color-mars-sand)",
          }}
        >
          Upgrades
        </button>
        <button
          type="button"
          aria-label="Close manifest terminal"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded border border-[var(--color-ui-border)] font-display text-mars-sand"
        >
          X
        </button>
      </div>

      {activeTab === "supplies" ? (
        <div
          data-testid="manifest-supplies"
          className="mt-2 grid min-h-0 grid-cols-1 gap-x-4 2xl:grid-cols-2"
        >
          {config.store.items.map((item) => (
            <StoreRow
              key={item.id}
              itemId={item.id}
              cart={cart}
              budget={budget}
              onAdjust={(dir) => onAdjust(item.id, dir)}
            />
          ))}
        </div>
      ) : (
        <div data-testid="manifest-upgrades" className="mt-2 grid min-h-0 grid-cols-1 gap-x-4">
          <p className="sr-only">Rover Upgrades</p>
          {config.upgrades.catalog.map((upg) => (
            <UpgradeRow
              key={upg.id}
              upgradeId={upg.id}
              cart={cart}
              selected={upgrades}
              budget={budget}
              onToggle={() => onToggleUpgrade(upg.id)}
            />
          ))}
        </div>
      )}
    </StationPanel>
  );
}

function CoDriverStation({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <StationPanel title="Rover Berth" eyebrow="Co-driver">
      <button
        type="button"
        aria-label="Close co-driver berth"
        onClick={onClose}
        className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded border border-[var(--color-ui-border)] font-display text-mars-sand"
      >
        X
      </button>
      <p className="mt-2 hidden max-w-[18rem] text-sm leading-snug text-mars-sand/80 tablet:block">
        The second chair sets the manifest doctrine before cargo moves.
      </p>
      <div className="mt-3 grid gap-2">
        {allCoDrivers().map((coDriver) => {
          const selected = coDriver.id === selectedId;
          return (
            <button
              key={coDriver.id}
              type="button"
              aria-label={`Recruit ${coDriver.name}`}
              onClick={() => {
                void tapLight();
                onSelect(coDriver.id);
                onClose();
              }}
              className="min-h-[64px] rounded border bg-black/30 p-2 text-left transition-colors hover:bg-[rgba(204,112,82,0.16)] tablet:min-h-[86px] tablet:p-3"
              style={{
                borderColor: selected ? "var(--color-ok)" : "var(--color-ui-border)",
                boxShadow: selected ? "inset 0 0 16px rgba(68,255,170,0.14)" : "none",
              }}
            >
              <div className="flex min-w-0 items-start gap-3">
                <NpcPortrait portrait={coDriver.portrait} name={coDriver.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-display text-sm tracking-wide text-mars-sand">
                      {coDriver.name}
                    </p>
                    <span className="shrink-0 font-display text-[0.58rem] uppercase tracking-[0.18em] text-mars-dust">
                      {selected ? "Recruited" : "Recruit"}
                    </span>
                  </div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-mars-sand/55">
                    {coDriver.role}
                  </p>
                  <p className="mt-1 hidden text-xs leading-snug text-mars-sand/75 tablet:line-clamp-2">
                    {coDriver.summary}
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-mars-dust/70">
                    {coDriver.tradeoff}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </StationPanel>
  );
}

function NpcStation({
  station,
  cart,
  flags,
  onFlag,
  onOpenManifest,
  onClose,
}: {
  station: NpcDepotStation;
  cart: DepotState;
  flags: ReadonlySet<string>;
  onFlag: (flag: string) => void;
  onOpenManifest: () => void;
  onClose: () => void;
}) {
  const npcId =
    station === "okonkwo" ? "npc:depot-quartermaster-okonkwo" : "npc:depot-prospector-reyes";
  const npc = getNpc(npcId);
  const [resolved, setResolved] = useState<ResolvedEncounter | null>(() =>
    resolveDepotEncounter(npcId, cart, flags),
  );

  if (!npc || !resolved) return null;

  function choose(choice: EncounterChoice) {
    void tapLight();
    if (choice.setsFlag) onFlag(choice.setsFlag);
    if (choice.opensTrade) onOpenManifest();
    if (choice.goto && resolved) {
      const bank = getEncounterBank(resolved.bankId);
      if (bank) setResolved(gotoNode(bank, choice.goto));
      return;
    }
    onClose();
  }

  return (
    <StationPanel title={npc.name} eyebrow={npc.archetype}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <NpcPortrait portrait={npc.portrait ?? npc.id} name={npc.name} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm text-mars-sand">{npc.name}</p>
            <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-mars-dust/70">
              {npc.archetype}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={`Close ${npc.name}`}
          onClick={onClose}
          className="grid h-10 w-10 shrink-0 place-items-center rounded border border-[var(--color-ui-border)] font-display text-mars-sand"
        >
          X
        </button>
      </div>

      <div className="mt-3 grid gap-1 rounded border-l-2 border-[var(--color-mars-dust)] bg-black/30 p-3">
        {resolved.node.lines.map((line) => (
          <p key={`${resolved.nodeKey}:${line}`} className="text-sm leading-snug text-mars-sand/85">
            {line}
          </p>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        {resolved.node.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice)}
            className="min-h-[44px] rounded border border-[var(--color-ui-border)] bg-black/30 px-3 py-2 text-left font-display text-sm text-mars-sand transition-colors hover:bg-[rgba(204,112,82,0.16)]"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </StationPanel>
  );
}

function StationPanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <GlassPanel
      data-testid="depot-station-panel"
      className="pointer-events-auto absolute inset-x-3 bottom-[6.5rem] max-h-[calc(100dvh-16rem)] overflow-hidden p-4 tablet:inset-x-auto tablet:top-[max(6rem,env(safe-area-inset-top))] tablet:right-4 tablet:bottom-4 tablet:w-[min(25rem,40vw)] tablet:max-h-none foldable:w-[28rem]"
      motionProps={{
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.2 },
      }}
    >
      <p className="font-display text-[0.58rem] uppercase tracking-[0.28em] text-mars-dust">
        {eyebrow}
      </p>
      <h3 className="font-display text-lg font-bold tracking-wide text-mars-sand">{title}</h3>
      <div className="mt-2 min-h-0">{children}</div>
    </GlassPanel>
  );
}

export function DepotScreen() {
  const goTo = useGameStore((s) => s.goTo);
  const seed = useGameStore((s) => s.seed);
  const sponsorId = useGameStore((s) => s.sponsorId);
  const profile = useDeviceProfile();
  const sponsor = getSponsor(sponsorId);
  const budget = sponsor?.budget ?? config.store.budget;
  const scoreMultiplier = sponsor?.scoreMultiplier ?? 1;

  const [cart, setCart] = useState<DepotState>(() => initialDepot());
  const [upgrades, setUpgrades] = useState<string[]>([]);
  const [socialFlags, setSocialFlags] = useState<Set<string>>(() => new Set());
  const [coDriverId, setCoDriverId] = useState<string | null>(null);
  const [activeStation, setActiveStation] = useState<DepotStation>(null);
  const [manifestTab, setManifestTab] = useState<ManifestTab>("supplies");

  const payload = useMemo(() => cartPayload(cart), [cart]);
  const credits = budget - cartCost(cart) - upgradesCreditCost(upgrades);
  const missing = useMemo(() => missingVitals(cart), [cart]);
  const cap = config.store.payloadCap;
  const coDriver = coDriverId ? getCoDriver(coDriverId) : undefined;
  const canProvision = coDriverId != null;
  const canDepart = canProvision && credits >= 0 && missing.length === 0;
  const sponsorLine = sponsor
    ? `${sponsor.name} · x${sponsor.scoreMultiplier} score`
    : "UNOMA Quartermaster";

  function setStation(station: DepotStation) {
    void tapLight();
    if (station === "manifest" && !canProvision) {
      setActiveStation("codriver");
      return;
    }
    setActiveStation((current) => (current === station ? null : station));
  }

  function toggleUpgrade(id: string) {
    void tapLight();
    setUpgrades((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  function addSocialFlag(flag: string) {
    setSocialFlags((prev) => {
      const next = new Set(prev);
      next.add(flag);
      return next;
    });
  }

  function depart() {
    if (!canDepart) return;
    void tapLight();
    audio.unlock();
    run.start(
      seed ?? `ares-${Date.now().toString(36)}`,
      buildLoadout(cart, upgrades, scoreMultiplier, coDriverId ?? undefined),
    );
    run.addEncounterFlags(socialFlags);
    run.setDriving(true);
    goTo("travel");
  }

  return (
    <div
      data-device-profile={profile.profile}
      data-device-orientation={profile.orientation}
      className="pointer-events-none relative h-full"
    >
      <MissionStrip
        sponsorLine={sponsorLine}
        credits={credits}
        budget={budget}
        payload={payload}
        cap={cap}
        missing={missing}
      />

      {activeStation === "codriver" && (
        <CoDriverStation
          selectedId={coDriverId}
          onSelect={setCoDriverId}
          onClose={() => setActiveStation(null)}
        />
      )}

      {activeStation === "manifest" && (
        <ManifestTerminal
          cart={cart}
          upgrades={upgrades}
          budget={budget}
          activeTab={manifestTab}
          onTab={setManifestTab}
          onAdjust={(itemId, dir) => {
            if (dir === 1) void tapLight();
            setCart((c) => adjust(c, itemId, dir, budget));
          }}
          onToggleUpgrade={toggleUpgrade}
          onClose={() => setActiveStation(null)}
        />
      )}

      {(activeStation === "okonkwo" || activeStation === "reyes") && (
        <NpcStation
          key={activeStation}
          station={activeStation}
          cart={cart}
          flags={socialFlags}
          onFlag={addSocialFlag}
          onOpenManifest={() => {
            setActiveStation("manifest");
            setManifestTab("supplies");
          }}
          onClose={() => setActiveStation(null)}
        />
      )}

      <div
        data-testid="depot-action-dock"
        className={`pointer-events-auto absolute bottom-3 grid-cols-2 gap-2 pb-[max(0rem,env(safe-area-inset-bottom))] tablet:bottom-4 tablet:grid tablet:grid-cols-5 ${
          profile.profile === "phone" && activeStation ? "hidden" : "grid"
        }`}
        style={{
          display: profile.profile === "phone" && activeStation ? "none" : undefined,
          left:
            profile.profile === "tablet"
              ? "auto"
              : profile.profile === "foldable"
                ? "1rem"
                : "0.75rem",
          right: profile.profile === "phone" ? "0.75rem" : "1rem",
          width:
            profile.profile === "tablet"
              ? "min(42rem, calc(100vw - 2rem))"
              : profile.profile === "foldable"
                ? "auto"
                : undefined,
        }}
      >
        <StationButton
          label="Recruit Co-driver"
          detail={coDriver ? coDriver.role : "Required"}
          active={activeStation === "codriver"}
          onClick={() => setStation("codriver")}
        />
        <StationButton
          label="Manifest Terminal"
          detail={canProvision ? (manifestTab === "supplies" ? "Supplies" : "Upgrades") : "Locked"}
          active={activeStation === "manifest"}
          disabled={!canProvision}
          onClick={() => setStation("manifest")}
        />
        <StationButton
          label="Talk to Okonkwo"
          detail={socialFlags.has("flag:okonkwo-briefed") ? "Briefed" : "Quartermaster"}
          active={activeStation === "okonkwo"}
          onClick={() => setStation("okonkwo")}
        />
        <StationButton
          label="Talk to Reyes"
          detail={socialFlags.has("flag:reyes-tipped") ? "Route tip logged" : "Navigator"}
          active={activeStation === "reyes"}
          onClick={() => setStation("reyes")}
        />
        <button
          type="button"
          onClick={depart}
          disabled={!canDepart}
          className="col-span-2 min-h-[56px] min-w-0 rounded border px-3 py-2 font-display text-[0.72rem] uppercase tracking-[0.1em] text-mars-sand transition-colors hover:text-mars-dust disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-mars-sand tablet:col-span-1"
          style={{
            borderColor: !canDepart ? "var(--color-alert)" : "var(--color-ui-border)",
            background: !canDepart ? "rgba(255,90,60,0.16)" : "rgba(204,112,82,0.16)",
            minHeight: 56,
          }}
        >
          {credits < 0 ? "Over Budget" : "Clear Airlock & Depart"}
        </button>
      </div>
    </div>
  );
}
