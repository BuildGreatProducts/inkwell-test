"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, CardHeader, CardTitle, Input, Textarea } from "@/components/ui";

interface VoiceProfile {
  _id: Id<"voiceProfiles">;
  formalityLevel: string;
  teachingStyle: string;
  vocabularyPatterns: string[];
  commonPhrases: string[];
  personalityTraits: string[];
  additionalNotes?: string;
  isApproved: boolean;
}

interface VoiceProfileCardProps {
  voiceProfile: VoiceProfile;
  onRegenerate?: (feedback: string) => Promise<void>;
  isRegenerating?: boolean;
}

export function VoiceProfileCard({
  voiceProfile,
  onRegenerate,
  isRegenerating = false,
}: VoiceProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [editedProfile, setEditedProfile] = useState({
    formalityLevel: voiceProfile.formalityLevel,
    teachingStyle: voiceProfile.teachingStyle,
    vocabularyPatterns: voiceProfile.vocabularyPatterns.join("\n"),
    commonPhrases: voiceProfile.commonPhrases.join("\n"),
    personalityTraits: voiceProfile.personalityTraits.join("\n"),
    additionalNotes: voiceProfile.additionalNotes || "",
  });

  const updateVoiceProfile = useMutation(api.ai.updateVoiceProfile);
  const approveVoiceProfile = useMutation(api.ai.approveVoiceProfile);

  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateVoiceProfile({
        voiceProfileId: voiceProfile._id,
        formalityLevel: editedProfile.formalityLevel,
        teachingStyle: editedProfile.teachingStyle,
        vocabularyPatterns: editedProfile.vocabularyPatterns
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        commonPhrases: editedProfile.commonPhrases
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        personalityTraits: editedProfile.personalityTraits
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        additionalNotes: editedProfile.additionalNotes || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save voice profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approveVoiceProfile({ voiceProfileId: voiceProfile._id });
    } catch (error) {
      console.error("Failed to approve voice profile:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRegenerate = async () => {
    if (onRegenerate && feedback.trim()) {
      await onRegenerate(feedback.trim());
      setFeedback("");
      setShowFeedbackForm(false);
    }
  };

  if (isEditing) {
    return (
      <Card variant="default" className="p-6">
        <CardHeader className="mb-6">
          <CardTitle>Edit Voice Profile</CardTitle>
        </CardHeader>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Formality Level
            </label>
            <Input
              value={editedProfile.formalityLevel}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, formalityLevel: e.target.value })
              }
              placeholder="e.g., Casual and approachable with occasional technical depth"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Teaching Style
            </label>
            <Input
              value={editedProfile.teachingStyle}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, teachingStyle: e.target.value })
              }
              placeholder="e.g., Story-driven with personal anecdotes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Vocabulary Patterns (one per line)
            </label>
            <Textarea
              value={editedProfile.vocabularyPatterns}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, vocabularyPatterns: e.target.value })
              }
              rows={4}
              placeholder="Uses sports metaphors&#10;Technical jargon when explaining concepts&#10;Colloquial language"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Common Phrases (one per line)
            </label>
            <Textarea
              value={editedProfile.commonPhrases}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, commonPhrases: e.target.value })
              }
              rows={4}
              placeholder="&quot;Here's the thing...&quot;&#10;&quot;What I've learned is...&quot;"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Personality Traits (one per line)
            </label>
            <Textarea
              value={editedProfile.personalityTraits}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, personalityTraits: e.target.value })
              }
              rows={3}
              placeholder="Empathetic&#10;Direct&#10;Humorous"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Additional Notes (optional)
            </label>
            <Textarea
              value={editedProfile.additionalNotes}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, additionalNotes: e.target.value })
              }
              rows={2}
              placeholder="Any other characteristics to preserve..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" className="p-6">
      <CardHeader className="flex flex-row items-start justify-between mb-6">
        <div>
          <CardTitle>Your Voice Profile</CardTitle>
          <p className="text-sm text-neutral-500 mt-1">
            This profile captures your unique communication style
          </p>
        </div>
        {voiceProfile.isApproved && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
            Approved
          </span>
        )}
      </CardHeader>

      <div className="space-y-6">
        {/* Formality Level */}
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-1">Formality Level</h4>
          <p className="text-neutral-600">{voiceProfile.formalityLevel}</p>
        </div>

        {/* Teaching Style */}
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-1">Teaching Style</h4>
          <p className="text-neutral-600">{voiceProfile.teachingStyle}</p>
        </div>

        {/* Vocabulary Patterns */}
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-2">Vocabulary Patterns</h4>
          <div className="flex flex-wrap gap-2">
            {voiceProfile.vocabularyPatterns.map((pattern, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-50 text-primary-700"
              >
                {pattern}
              </span>
            ))}
          </div>
        </div>

        {/* Common Phrases */}
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-2">Common Phrases</h4>
          <ul className="space-y-1">
            {voiceProfile.commonPhrases.map((phrase, index) => (
              <li key={index} className="text-neutral-600 text-sm">
                &ldquo;{phrase}&rdquo;
              </li>
            ))}
          </ul>
        </div>

        {/* Personality Traits */}
        <div>
          <h4 className="text-sm font-medium text-neutral-900 mb-2">Personality Traits</h4>
          <div className="flex flex-wrap gap-2">
            {voiceProfile.personalityTraits.map((trait, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-neutral-100 text-neutral-700"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        {voiceProfile.additionalNotes && (
          <div>
            <h4 className="text-sm font-medium text-neutral-900 mb-1">Additional Notes</h4>
            <p className="text-neutral-600 text-sm">{voiceProfile.additionalNotes}</p>
          </div>
        )}
      </div>

      {/* Feedback Form */}
      {showFeedbackForm && (
        <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            What should be different?
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder="e.g., I'm more formal than this suggests, or I use more humor..."
          />
          <div className="flex justify-end gap-3 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedbackForm(false)}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
              isLoading={isRegenerating}
              disabled={!feedback.trim()}
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-neutral-100">
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Edit Profile
        </Button>
        {onRegenerate && !showFeedbackForm && (
          <Button variant="outline" onClick={() => setShowFeedbackForm(true)}>
            Regenerate with Feedback
          </Button>
        )}
        {!voiceProfile.isApproved && (
          <Button onClick={handleApprove} isLoading={isApproving}>
            Approve Profile
          </Button>
        )}
      </div>
    </Card>
  );
}
