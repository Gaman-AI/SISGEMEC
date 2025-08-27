import React from 'react';

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const EmptyState: React.FC<Props> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
      <div className="mb-3 text-xl font-semibold text-gray-800 dark:text-gray-100" aria-live="polite">
        {title}
      </div>
      {description && (
        <p className="mb-4 max-w-lg text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action}
    </div>
  );
};

export default EmptyState;
