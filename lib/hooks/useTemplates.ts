// lib/hooks/useTemplates.ts
import { useState, useCallback, useEffect } from 'react';
import { WorkoutTemplate } from '@/types/templates';
import { useTemplateService } from '@/components/DatabaseProvider';

export function useTemplates() {
  const templateService = useTemplateService();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [archivedTemplates, setArchivedTemplates] = useState<WorkoutTemplate[]>([]);

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
      // Add default values for new properties
      const templateWithDefaults = {
        ...template,
        isArchived: template.isArchived !== undefined ? template.isArchived : false,
        // Only set authorPubkey if not provided and we have an authenticated user
        // (you would need to import useNDKCurrentUser from your NDK hooks)
      };
      
      const id = await templateService.createTemplate(templateWithDefaults);
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

  // Add new archive/unarchive method
  const archiveTemplate = useCallback(async (id: string, archive: boolean = true) => {
    try {
      await templateService.archiveTemplate(id, archive);
      await loadTemplates(); // Refresh the list
    } catch (err) {
      console.error(`Error ${archive ? 'archiving' : 'unarchiving'} template:`, err);
      throw err;
    }
  }, [templateService, loadTemplates]);

  // Add support for loading archived templates
  const loadArchivedTemplates = useCallback(async (limit: number = 50, offset: number = 0) => {
    try {
      setLoading(true);
      const data = await templateService.getArchivedTemplates(limit, offset);
      // You might want to store archived templates in a separate state variable
      // For now, I'll assume you want to replace the main templates list
      setTemplates(data);
      setError(null);
      setArchivedTemplates(data);
    } catch (err) {
      console.error('Error loading archived templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to load archived templates'));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [templateService]);

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    archivedTemplates,
    loading,
    error,
    loadTemplates,
    loadArchivedTemplates, 
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate, 
    refreshTemplates: loadTemplates
  };
}