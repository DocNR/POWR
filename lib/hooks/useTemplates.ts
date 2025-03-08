// lib/hooks/useTemplates.ts
import { useState, useCallback, useEffect } from 'react';
import { WorkoutTemplate } from '@/types/templates';
import { useTemplateService } from '@/components/DatabaseProvider';

export function useTemplates() {
  const templateService = useTemplateService();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTemplates = useCallback(async (limit: number = 50, offset: number = 0) => {
    try {
      setLoading(true);
      const data = await templateService.getAllTemplates(limit, offset);
      setTemplates(data);
      setError(null);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to load templates'));
      // Use empty array if database isn't ready
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [templateService]);

  const getTemplate = useCallback(async (id: string) => {
    try {
      return await templateService.getTemplate(id);
    } catch (err) {
      console.error('Error getting template:', err);
      throw err;
    }
  }, [templateService]);

  const createTemplate = useCallback(async (template: Omit<WorkoutTemplate, 'id'>) => {
    try {
      const id = await templateService.createTemplate(template);
      await loadTemplates(); // Refresh the list
      return id;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  }, [templateService, loadTemplates]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<WorkoutTemplate>) => {
    try {
      await templateService.updateTemplate(id, updates);
      await loadTemplates(); // Refresh the list
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  }, [templateService, loadTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await templateService.deleteTemplate(id);
      setTemplates(current => current.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  }, [templateService]);

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    loadTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refreshTemplates: loadTemplates
  };
}