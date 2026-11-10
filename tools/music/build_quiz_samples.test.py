"""Focused regression checks for the recorded quiz sample builder."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np

SPEC = importlib.util.spec_from_file_location(
    "quiz_samples", Path(__file__).with_name("build_quiz_samples.py")
)


class RecordedSampleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.builder = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(cls.builder)

    def test_padding_preserves_every_recorded_frame(self):
        original = np.array([0, 120, -200, 500, -100, 0], dtype=np.int16)
        output = self.builder.pad_to_minimum(original, rate=8)
        np.testing.assert_array_equal(output[:len(original)], original)
        np.testing.assert_array_equal(output[len(original):], 0)
        self.assertEqual(len(output), 16)

    def test_long_recording_is_never_cut_to_meet_duration(self):
        original = np.arange(40, dtype=np.int16)
        np.testing.assert_array_equal(self.builder.pad_to_minimum(original, rate=8), original)

    def test_git_blob_hash_includes_git_header(self):
        self.assertEqual(self.builder.blob_sha(b"test\n"),
                         "9daeafb9864cf43055ae93beb0afd6c7d144bfa4")

    def test_sfz_root_must_come_from_the_matching_region(self):
        text = "<region>sample=wrong.wav pitch_keycenter=60\n<region>sample=right.wav pitch_keycenter=72"
        self.assertEqual(self.builder.mapping_root(text, "right.wav"), 72)
        with self.assertRaises(ValueError):
            self.builder.mapping_root(text, "missing.wav")

    def test_silent_audio_is_rejected(self):
        with self.assertRaises(ValueError):
            self.builder.measure(np.zeros(88200, dtype=np.int16), 44100, 60)


if __name__ == "__main__":
    unittest.main()
