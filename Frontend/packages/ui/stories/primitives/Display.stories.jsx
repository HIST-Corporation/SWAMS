import { Avatar, Badge, Skeleton } from '../../src/index.js';

export default { title: 'Primitives/Display', parameters: { layout: 'centered' } };

export const BadgeTones = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Queued</Badge>
      <Badge tone="primary">In review</Badge>
      <Badge tone="success">Approved</Badge>
      <Badge tone="warning">Needs info</Badge>
      <Badge tone="danger">Rejected</Badge>
      <Badge tone="info">Synced</Badge>
    </div>
  ),
};

export const AvatarHues = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        {['indigo', 'marigold', 'teal', 'rose', 'violet'].map((hue) => (
          <Avatar key={hue} hue={hue} name={nameFor(hue)} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Avatar name="Sita Shrestha" size="sm" hue="teal" />
        <Avatar name="Sita Shrestha" size="md" hue="teal" />
        <Avatar name="Sita Shrestha" size="lg" hue="teal" />
      </div>
      <Avatar name="Anita Thapa Magar Longer Name" hue="rose" />
    </div>
  ),
};

function nameFor(hue) {
  return {
    indigo: 'Ramesh Adhikari',
    marigold: 'Anita Thapa',
    teal: 'Prakash Gurung',
    rose: 'Sunita Rai',
    violet: 'Bibek Karki',
  }[hue];
}

export const SkeletonShapes = {
  render: () => (
    <div className="w-80 space-y-3" aria-busy="true">
      <Skeleton />
      <Skeleton className="max-w-40" />
      <div className="flex gap-3">
        <Skeleton block className="h-10 w-10 max-w-10 rounded-pill" />
        <div className="flex-1 space-y-2">
          <Skeleton />
          <Skeleton className="max-w-52" />
        </div>
      </div>
      <Skeleton block className="h-24 max-w-full rounded-card" />
    </div>
  ),
};
