const ORB_CLASSES = "absolute aspect-square rounded-full blur-[80px] motion-reduce:animate-none";

const AuroraStage = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-0"
  >
    <div
      className={`${ORB_CLASSES} -top-[25vmax] -left-[15vmax] w-[60vmax] animate-aurora-indigo opacity-(--aurora-opacity) bg-[radial-gradient(circle,var(--brand),transparent_70%)]`}
    />
    <div
      className={`${ORB_CLASSES} -right-[20vmax] -bottom-[30vmax] w-[60vmax] animate-aurora-teal opacity-(--aurora-opacity) bg-[radial-gradient(circle,var(--brand-2),transparent_70%)]`}
    />
    <div
      className={`${ORB_CLASSES} top-1/4 left-[35%] w-[40vmax] animate-aurora-amber bg-[radial-gradient(circle,var(--accent),transparent_70%)] opacity-30`}
    />
    <div className="absolute inset-0 bg-(image:--aurora-noise) opacity-[0.02]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--bg-0)_100%)]" />
  </div>
);

export default AuroraStage;
